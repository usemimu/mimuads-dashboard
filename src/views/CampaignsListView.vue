<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhPlus, PhMegaphone, PhSealCheck, PhMagnifyingGlass, PhSquaresFour, PhListBullets, PhFilmSlate, PhPlay, PhArrowsOut, PhVideoCamera, PhImage } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import { listCampaigns, pauseCampaign, resumeCampaign } from '@/api/campaigns'
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

const { data, isLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaigns', statusFilter.value || 'all')),
  queryFn: () => listCampaigns(statusFilter.value ? { status: statusFilter.value } : {}),
})
const campaigns = computed<Campaign[]>(() => data.value?.campaigns ?? [])

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? campaigns.value.filter((c) => c.name.toLowerCase().includes(q)) : campaigns.value
})

// Metric strip (X's KPI row) over the loaded set.
const activeCount = computed(() => campaigns.value.filter((c) => c.status === 'active').length)
const totalSpendKobo = computed(() => campaigns.value.reduce((s, c) => s + Number(c.spentKobo || 0), 0))

function pacing(c: Campaign): number {
  const b = Number(c.budgetKobo)
  return b ? Math.min(100, Math.round((Number(c.spentKobo) / b) * 100)) : 0
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
      <MetricTile :label="$t('dashboard.mActive')" :value="activeCount" />
      <MetricTile :label="$t('campaigns.title')" :value="campaigns.length" />
      <MetricTile :label="$t('dashboard.mSpend')" :value="formatKobo(String(totalSpendKobo), { showDecimals: false })" />
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
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="c in visible"
          :key="c.id"
          class="group overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-all hover:border-line-strong hover:shadow-card-hover"
        >
          <div class="relative aspect-video overflow-hidden bg-black">
            <!-- Inline playback once the user hits play; native controls, same
                 approach as the creative review preview. -->
            <video
              v-if="playing === c.id && c.previewUrl"
              :key="c.previewUrl"
              :src="c.previewUrl"
              :poster="c.posterUrl || undefined"
              controls
              autoplay
              playsinline
              class="h-full w-full bg-black object-contain"
            />
            <template v-else>
              <img
                v-if="c.posterUrl"
                :src="c.posterUrl"
                alt=""
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-neutral-600">
                <PhFilmSlate :size="32" />
              </div>
              <!-- Play button for video creatives — plays the preview in place. -->
              <button
                v-if="c.creativeFormat === 'video' && c.previewUrl"
                type="button"
                class="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                :title="$t('campaigns.play')"
                :aria-label="$t('campaigns.play')"
                @click="playing = c.id"
              >
                <span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-clay-600 shadow-lg transition-transform group-hover:scale-105">
                  <PhPlay :size="26" weight="fill" />
                </span>
              </button>
              <Badge :tone="statusTone(c.status)" class="absolute left-2 top-2 shadow-sm">{{ statusLabel(c.status) }}</Badge>
              <!-- Format marker so video vs image campaigns are distinguishable at a glance. -->
              <span
                v-if="c.creativeFormat"
                class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white shadow-sm backdrop-blur-sm"
                :title="c.creativeFormat === 'video' ? $t('campaigns.formatVideo') : $t('campaigns.formatImage')"
              >
                <PhVideoCamera v-if="c.creativeFormat === 'video'" :size="12" weight="fill" />
                <PhImage v-else :size="12" weight="fill" />
                {{ c.creativeFormat === 'video' ? $t('campaigns.formatVideo') : $t('campaigns.formatImage') }}
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
                <!-- Format marker: video vs image at a glance. -->
                <PhVideoCamera
                  v-if="c.creativeFormat === 'video'"
                  :size="14"
                  weight="fill"
                  class="shrink-0 text-neutral-400"
                  :aria-label="$t('campaigns.formatVideo')"
                />
                <PhImage
                  v-else-if="c.creativeFormat === 'image'"
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
  </div>
</template>
