<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhPlus, PhMegaphone, PhSealCheck, PhMagnifyingGlass, PhSquaresFour, PhListBullets, PhFilmSlate, PhPlay, PhArrowsOut, PhVideoCamera, PhImage, PhStack, PhX, PhBroadcast, PhCurrencyNgn } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import { listCampaigns, pauseCampaign, resumeCampaign } from '@/api/campaigns'
import { getCarousel } from '@/api/carousel'
import type { Campaign } from '@/api/contracts/campaigns'
import { useSession } from '@/stores/session'
import { useWizard } from '@/stores/wizard'
import { useKyc } from '@/composables/useKyc'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { statusTone, statusLabel } from '@/lib/status'

const router = useRouter()
const session = useSession()
const wizard = useWizard()
const qc = useQueryClient()

// Campaign creation is gated on identity verification (kycComplete) — the
// same milestone the mobile app gates on. Business approval pending does
// NOT block. Until KYC is done the whole campaigns surface is replaced by
// a verify-first prompt.
const { kycComplete, isLoading: kycLoading } = useKyc()

const statusFilter = ref('')
const search = ref('')
const selected = ref<Set<string>>(new Set())
const view = ref<'grid' | 'list'>('grid') // preview cards vs table
const playing = ref<string | null>(null) // campaign id whose creative is playing inline

// Carousel frames viewer. A carousel's parent has no single previewUrl, so we
// fetch its ordered frames on demand and show them in a modal (mirrors the
// admin review view). cdnUrl is populated post-approval; pending frames render
// a placeholder tile.
type CarouselFrame = { id: string; sequence: number; format: string; dwellSeconds: number; filename: string; cdnUrl?: string | null }
const framesFor = ref<Campaign | null>(null)
const frames = ref<CarouselFrame[]>([])
const framesLoading = ref(false)
const framesTotal = computed(() => frames.value.reduce((s, f) => s + (f.dwellSeconds || 0), 0))

async function openFrames(c: Campaign) {
  const carouselId = (c.creative as { id?: string } | undefined)?.id
  if (!carouselId) return
  framesFor.value = c
  frames.value = []
  framesLoading.value = true
  try {
    const res = await getCarousel(carouselId)
    frames.value = (res.items ?? []) as CarouselFrame[]
  } catch {
    frames.value = []
  } finally {
    framesLoading.value = false
  }
}
function closeFrames() {
  framesFor.value = null
  frames.value = []
}

// Carousel cover: a carousel has no single previewUrl/poster, so lazily fetch
// its frames once and use the first image frame as the card cover. Keyed by
// campaign id; fetch guarded by carousel id so the 30s poll never refetches.
const carouselCoverById = ref<Record<string, string>>({})
const carouselFetched = new Set<string>()
function loadCarouselCovers(list: Campaign[]) {
  for (const c of list) {
    if (fmt(c) !== 'carousel' || c.posterUrl) continue
    const cid = (c.creative as { id?: string } | undefined)?.id
    if (!cid || carouselFetched.has(cid)) continue
    carouselFetched.add(cid)
    getCarousel(cid)
      .then((res) => {
        const items = (res.items ?? []) as CarouselFrame[]
        const first = items.find((f) => f.cdnUrl && f.format === 'image') ?? items.find((f) => f.cdnUrl)
        if (first?.cdnUrl) carouselCoverById.value = { ...carouselCoverById.value, [c.id]: first.cdnUrl }
      })
      .catch(() => {})
  }
}
// Cover image for a card: creative poster, else a cached carousel first-frame.
function cover(c: Campaign): string | null {
  return c.posterUrl || carouselCoverById.value[c.id] || null
}

// Always load the full set (no status param). The metric strip is computed over
// ALL campaigns, and the status dropdown + search filter the table client-side —
// so the KPIs stay accurate regardless of which filter the user has selected.
const { data, isLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaigns')),
  queryFn: () => listCampaigns({}),
  // Spend/status accrue server-side as ads play, so keep the list (and its KPI
  // strip) live: poll while the page is open and refetch when the tab regains
  // focus, rather than letting the numbers freeze for the whole staleTime.
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
})
const campaigns = computed<Campaign[]>(() => data.value?.campaigns ?? [])

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return campaigns.value.filter((c) => {
    if (statusFilter.value && c.status !== statusFilter.value) return false
    if (q && !c.name.toLowerCase().includes(q)) return false
    return true
  })
})

// Metric strip (X's KPI row) — always over the full set, never the filtered view.
const activeCount = computed(() => campaigns.value.filter((c) => c.status === 'active').length)
const totalCount = computed(() => data.value?.pagination?.total ?? campaigns.value.length)
const totalSpendKobo = computed(() => campaigns.value.reduce((s, c) => s + Number(c.spentKobo || 0), 0))

function pacing(c: Campaign): number {
  const b = Number(c.budgetKobo)
  return b ? Math.min(100, Math.round((Number(c.spentKobo) / b) * 100)) : 0
}

// Creative format for the card marker + play button. Prefer the top-level
// `creativeFormat` (added to the list endpoint) but fall back to the nested
// `creative.format` the API already returns today, so this works before the
// backend change ships.
function fmt(c: Campaign): 'video' | 'image' | 'carousel' | null {
  const f = c.creativeFormat ?? (c.creative as { format?: string } | undefined)?.format
  return f === 'video' || f === 'image' || f === 'carousel' ? f : null
}

// The backend mints a NEW presigned previewUrl on every list fetch (rotating
// X-Amz-Signature), so the 30s live-refetch would otherwise swap each <video>
// src and force a full re-download/flicker. Memoise the first URL we see per
// campaign (keyed by the stable S3 path, ignoring the query) so the media stays
// put across refetches; only refresh it if the underlying object actually changes.
const mediaUrlById = ref<Record<string, string>>({})
watch(
  campaigns,
  (list) => {
    const next = { ...mediaUrlById.value }
    for (const c of list) {
      if (!c.previewUrl) continue
      const path = c.previewUrl.split('?')[0]
      const existing = next[c.id]
      if (!existing || existing.split('?')[0] !== path) next[c.id] = c.previewUrl
    }
    mediaUrlById.value = next
    loadCarouselCovers(list)
  },
  { immediate: true },
)
function mediaUrl(c: Campaign): string | null {
  return mediaUrlById.value[c.id] ?? c.previewUrl ?? null
}

function toggle(id: string) {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
  selected.value = new Set(selected.value)
}
async function bulk(action: 'pause' | 'resume') {
  const fn = action === 'pause' ? pauseCampaign : resumeCampaign
  await Promise.allSettled([...selected.value].map((id) => fn(id)))
  selected.value = new Set()
  qc.invalidateQueries({ queryKey: ctxKey(session.context, 'campaigns') })
}
function startWizard() {
  wizard.reset()
  router.push('/campaigns/new')
}
</script>

<template>
  <div>
    <PageHeader :title="$t('campaigns.title')" :subtitle="$t('campaigns.subtitle')">
      <template #actions>
        <Button v-if="session.canSubmitCampaign && kycComplete" @click="startWizard">
          <PhPlus :size="16" /> {{ $t('campaigns.newCampaign') }}
        </Button>
      </template>
    </PageHeader>

    <!-- KYC gate: while identity verification isn't complete, the whole
         campaigns surface is replaced by a verify-first prompt. -->
    <Card v-if="kycLoading">
      <p class="py-6 text-center text-sm text-neutral-400">{{ $t('verification.checkingCampaigns') }}</p>
    </Card>

    <Card v-else-if="!kycComplete">
      <EmptyState :title="$t('verification.gateTitle')" :message="$t('verification.gateBody')">
        <template #icon><PhSealCheck :size="24" /></template>
        <template #actions>
          <RouterLink to="/verify">
            <Button><PhSealCheck :size="16" /> {{ $t('verification.gateCta') }}</Button>
          </RouterLink>
        </template>
      </EmptyState>
    </Card>

    <template v-else>
    <!-- Metric strip -->
    <div class="mb-5 grid grid-cols-3 gap-4">
      <MetricTile :label="$t('dashboard.mActive')" :value="activeCount" :icon="PhBroadcast" />
      <MetricTile :label="$t('campaigns.title')" :value="totalCount" :icon="PhMegaphone" />
      <MetricTile :label="$t('dashboard.mSpend')" :value="formatKobo(String(totalSpendKobo), { showDecimals: false })" :icon="PhCurrencyNgn" />
    </div>

    <!-- Controls -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <div class="relative min-w-[12rem] flex-1">
        <PhMagnifyingGlass :size="15" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" :placeholder="$t('dashboard.searchPlaceholder')" class="input py-1.5 pl-8 text-sm" />
      </div>
      <select
        v-model="statusFilter"
        :aria-label="$t('campaigns.status')"
        class="select w-auto text-sm"
      >
        <option value="">{{ $t('dashboard.scopeAll') }}</option>
        <option value="draft">Draft</option>
        <option value="pending_vetting">In review</option>
        <option value="approved">Scheduled</option>
        <option value="active">Live</option>
        <option value="paused">Paused</option>
        <option value="completed">Ended</option>
      </select>
      <template v-if="selected.size && session.canMutate">
        <span class="text-sm text-neutral-500">{{ selected.size }} selected</span>
        <Button size="sm" variant="secondary" @click="bulk('pause')">{{ $t('campaigns.bulkPause') }}</Button>
        <Button size="sm" variant="secondary" @click="bulk('resume')">{{ $t('campaigns.bulkResume') }}</Button>
      </template>
      <div class="flex overflow-hidden rounded-lg border border-line-strong">
        <button class="flex items-center gap-1 px-3 py-1.5 text-sm" :class="view === 'grid' ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'" :title="$t('campaigns.gridView')" @click="view = 'grid'">
          <PhSquaresFour :size="16" />
        </button>
        <button class="flex items-center gap-1 px-3 py-1.5 text-sm" :class="view === 'list' ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'" :title="$t('campaigns.listView')" @click="view = 'list'">
          <PhListBullets :size="16" />
        </button>
      </div>
    </div>

    <!-- Preview grid: each campaign as a card with its creative poster. -->
    <div v-if="view === 'grid'">
      <p v-if="isLoading" class="py-10 text-center text-sm text-neutral-400">{{ $t('common.loading') }}</p>
      <Card v-else-if="!visible.length">
        <EmptyState :title="$t('campaigns.empty')">
          <template #icon><PhMegaphone :size="24" /></template>
          <template v-if="session.canSubmitCampaign" #actions>
            <Button @click="startWizard"><PhPlus :size="16" /> {{ $t('campaigns.newCampaign') }}</Button>
          </template>
        </EmptyState>
      </Card>
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="c in visible"
          :key="c.id"
          class="group overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-all hover:border-line-strong hover:shadow-card-hover"
        >
          <div class="relative aspect-video overflow-hidden bg-black">
            <!-- Inline playback once the user hits play; native controls, same
                 approach as the creative review preview. -->
            <video
              v-if="playing === c.id && mediaUrl(c)"
              :key="c.id"
              :src="mediaUrl(c)!"
              :poster="c.posterUrl || undefined"
              controls
              autoplay
              playsinline
              class="h-full w-full bg-black object-contain"
            />
            <template v-else>
              <img
                v-if="cover(c)"
                :src="cover(c)!"
                alt=""
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <!-- No poster from the API (posterUrl null): fall back to the video
                   itself, seeking ~1s in (#t=1) so we skip any black fade-in and
                   show a real frame. preload=metadata keeps it from pulling the
                   whole clip. -->
              <video
                v-else-if="mediaUrl(c)"
                :key="c.id"
                :src="`${mediaUrl(c)}#t=1`"
                muted
                playsinline
                preload="metadata"
                class="h-full w-full bg-black object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-neutral-600">
                <PhFilmSlate :size="32" />
              </div>
              <!-- Play button for video creatives — always visible (darkens the
                   overlay on hover), plays the preview in place. -->
              <button
                v-if="fmt(c) === 'video' && c.previewUrl"
                type="button"
                class="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30"
                :title="$t('campaigns.play')"
                :aria-label="$t('campaigns.play')"
                @click="playing = c.id"
              >
                <span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-clay-600 shadow-lg transition-transform group-hover:scale-105">
                  <PhPlay :size="26" weight="fill" />
                </span>
              </button>
              <!-- Carousels have no single preview — open the ordered frames. -->
              <button
                v-else-if="fmt(c) === 'carousel'"
                type="button"
                class="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30"
                title="View frames"
                aria-label="View frames"
                @click="openFrames(c)"
              >
                <span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-clay-600 shadow-lg transition-transform group-hover:scale-105">
                  <PhStack :size="26" weight="fill" />
                </span>
              </button>
              <Badge :tone="statusTone(c.status)" class="absolute left-2 top-2 shadow-sm">{{ statusLabel(c.status) }}</Badge>
              <!-- Format marker so video vs image campaigns are distinguishable at a glance. -->
              <span
                v-if="fmt(c)"
                class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white shadow-sm backdrop-blur-sm"
                :title="fmt(c) === 'carousel' ? 'Carousel' : (fmt(c) === 'video' ? $t('campaigns.formatVideo') : $t('campaigns.formatImage'))"
              >
                <PhStack v-if="fmt(c) === 'carousel'" :size="12" weight="fill" />
                <PhVideoCamera v-else-if="fmt(c) === 'video'" :size="12" weight="fill" />
                <PhImage v-else :size="12" weight="fill" />
                {{ fmt(c) === 'carousel' ? 'Carousel' : (fmt(c) === 'video' ? $t('campaigns.formatVideo') : $t('campaigns.formatImage')) }}
              </span>
            </template>
          </div>
          <div class="p-3">
            <div class="flex items-start justify-between gap-2">
              <RouterLink :to="`/campaigns/${c.id}`" class="min-w-0">
                <p class="truncate font-medium text-neutral-900 hover:text-clay-600">{{ c.name }}</p>
                <p class="text-xs capitalize text-neutral-400">{{ c.objective }}</p>
              </RouterLink>
              <!-- "Full" opens the campaign detail page. -->
              <RouterLink
                :to="`/campaigns/${c.id}`"
                class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line-strong px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-clay-600"
                :title="$t('campaigns.full')"
              >
                <PhArrowsOut :size="13" /> {{ $t('campaigns.full') }}
              </RouterLink>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="font-mono text-neutral-500">{{ formatKobo(c.spentKobo, { showDecimals: false }) }} / {{ formatKobo(c.budgetKobo, { showDecimals: false }) }}</span>
              <span class="font-mono text-neutral-400">{{ pacing(c) }}%</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div class="h-full rounded-full bg-clay-500" :style="{ width: pacing(c) + '%' }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Card v-else padding="none" class="overflow-hidden">
      <table class="w-full text-sm">
        <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-400">
          <tr class="border-b border-neutral-100">
            <th class="w-10 px-5 py-3"></th>
            <th class="px-5 py-3 font-semibold">{{ $t('campaigns.name') }}</th>
            <th class="px-5 py-3 font-semibold">{{ $t('campaigns.status') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('campaigns.budget') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('campaigns.spent') }}</th>
            <th class="px-5 py-3 font-semibold">{{ $t('dashboard.colPacing') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="px-5 py-10 text-center text-neutral-400">{{ $t('common.loading') }}</td>
          </tr>
          <tr v-else-if="!visible.length">
            <td colspan="6" class="p-0">
              <EmptyState :title="$t('campaigns.empty')">
                <template #icon><PhMegaphone :size="24" /></template>
                <template v-if="session.canSubmitCampaign" #actions>
                  <Button @click="startWizard"><PhPlus :size="16" /> {{ $t('campaigns.newCampaign') }}</Button>
                </template>
              </EmptyState>
            </td>
          </tr>
          <tr
            v-for="c in visible"
            :key="c.id"
            class="border-t border-neutral-100 transition-colors hover:bg-neutral-50/70"
          >
            <td class="px-5 py-3">
              <input
                v-if="session.canMutate"
                type="checkbox"
                :checked="selected.has(c.id)"
                class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400"
                @change="toggle(c.id)"
              />
            </td>
            <td class="px-5 py-3">
              <div class="flex items-center gap-1.5">
                <!-- Format marker: video vs image vs carousel at a glance. -->
                <PhStack
                  v-if="fmt(c) === 'carousel'"
                  :size="14"
                  weight="fill"
                  class="shrink-0 text-neutral-400"
                  aria-label="Carousel"
                />
                <PhVideoCamera
                  v-else-if="fmt(c) === 'video'"
                  :size="14"
                  weight="fill"
                  class="shrink-0 text-neutral-400"
                  :aria-label="$t('campaigns.formatVideo')"
                />
                <PhImage
                  v-else-if="fmt(c) === 'image'"
                  :size="14"
                  weight="fill"
                  class="shrink-0 text-neutral-400"
                  :aria-label="$t('campaigns.formatImage')"
                />
                <RouterLink :to="`/campaigns/${c.id}`" class="font-medium text-neutral-900 hover:text-clay-600">
                  {{ c.name }}
                </RouterLink>
              </div>
              <p class="text-xs capitalize text-neutral-400">{{ c.objective }}</p>
            </td>
            <td class="px-5 py-3">
              <Badge :tone="statusTone(c.status)">{{ statusLabel(c.status) }}</Badge>
            </td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ formatKobo(c.budgetKobo, { showDecimals: false }) }}</td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ formatKobo(c.spentKobo, { showDecimals: false }) }}</td>
            <td class="px-5 py-3">
              <div class="flex items-center gap-2">
                <div class="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100">
                  <div class="h-full rounded-full bg-clay-500" :style="{ width: pacing(c) + '%' }" />
                </div>
                <span class="font-mono text-xs text-neutral-500">{{ pacing(c) }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
    </template>

    <!-- Carousel frames viewer. Teleported to <body> so `position: fixed`
         centres against the viewport, not the shell's animated (transformed)
         page container — otherwise the modal lands mid-page and needs scrolling. -->
    <Teleport to="body">
    <div
      v-if="framesFor"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="closeFrames"
    >
      <div class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-card-hover">
        <div class="flex items-center gap-2 border-b border-line px-5 py-3">
          <PhStack :size="18" class="text-clay-600" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-neutral-900">{{ framesFor.name }}</p>
            <p class="text-xs text-neutral-400">{{ frames.length }} frames · {{ framesTotal }}s</p>
          </div>
          <button type="button" class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100" @click="closeFrames">
            <PhX :size="18" />
          </button>
        </div>
        <div class="overflow-y-auto p-5">
          <div v-if="framesLoading" class="py-10 text-center text-sm text-neutral-400">Loading frames…</div>
          <div v-else-if="frames.length === 0" class="py-10 text-center text-sm text-neutral-400">No frames found for this carousel.</div>
          <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));">
            <div v-for="(f, i) in frames" :key="f.id" class="overflow-hidden rounded-lg border border-line">
              <div class="relative aspect-video bg-black">
                <img
                  v-if="f.cdnUrl && f.format === 'image'"
                  :src="f.cdnUrl"
                  alt=""
                  class="h-full w-full object-contain"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-neutral-500">
                  <PhVideoCamera v-if="f.format === 'video'" :size="26" />
                  <PhImage v-else :size="26" />
                </div>
                <span class="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{{ i + 1 }}</span>
                <span class="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{{ f.dwellSeconds }}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>
