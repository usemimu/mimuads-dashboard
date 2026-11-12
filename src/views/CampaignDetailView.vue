<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Tabs from '@/components/ui/Tabs.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import OfferCard from '@/components/OfferCard.vue'
import { PhPlay, PhCurrencyNgn, PhChartLineUp, PhUsersThree, PhFilmSlate, PhVideoCamera, PhImage, PhStack, PhArrowLeft } from '@phosphor-icons/vue'
import { getCarousel } from '@/api/carousel'
import { statusTone, statusLabel } from '@/lib/status'
import { useSession } from '@/stores/session'
import {
  getCampaign, getPerformance, getPerformanceBreakdown, getDecisionFactors,
  getCampaignSummaries,
  pauseCampaign, resumeCampaign, topUpCampaign, extendCampaign, cloneCampaign,
} from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const session = useSession()
const qc = useQueryClient()
const toast = useToastStore()
const { t } = useI18n()
const id = computed(() => String(route.params.id))

const { data: c } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaign', id.value)),
  queryFn: () => getCampaign(id.value),
})

const pacing = computed(() => {
  if (!c.value) return 0
  const b = Number(c.value.budgetKobo), sp = Number(c.value.spentKobo)
  return b > 0 ? Math.min(100, Math.round((sp / b) * 100)) : 0
})

type PerfTab = 'overall' | 'by-screen' | 'by-hour' | 'by-day'
const tab = ref<PerfTab>('overall')
const perfTabs = computed<ReadonlyArray<{ value: PerfTab; label: string }>>(() => [
  { value: 'overall', label: t('campaigns.tabOverall') },
  { value: 'by-screen', label: t('campaigns.tabByScreen') },
  { value: 'by-hour', label: t('campaigns.tabByHour') },
  { value: 'by-day', label: t('campaigns.tabByDay') },
])
// Overall perf is always fetched (drives the Overall tab tiles AND the sidebar
// details/pacing, which must stay populated regardless of the active tab).
const { data: perfOverall } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'perf', id.value, 'overall')),
  queryFn: () => getPerformance(id.value),
})
// Breakdown perf only loads when a breakdown tab is active.
const { data: perf } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'perf', id.value, tab.value)),
  queryFn: () => getPerformanceBreakdown(id.value, tab.value as 'by-screen' | 'by-hour' | 'by-day'),
  enabled: computed(() => tab.value !== 'overall'),
})
const { data: factors } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'factors', id.value)),
  queryFn: () => getDecisionFactors(id.value),
})
const factorList = computed(() => {
  const f = factors.value as { factors?: Array<{ label?: string; name?: string; weight?: number; value?: number }> } | undefined
  return f?.factors ?? []
})

// ── Performance (untyped API responses → typed accessors) ─────────────
interface Overall {
  metrics?: { totalPlays?: number; totalImpressions?: number; totalAttentionSeconds?: number; averageAttentionSeconds?: number }
  pacing?: { status?: string; daysElapsed?: number; daysRemaining?: number; formattedExpectedSpend?: string }
  timeline?: { startDate?: string; endDate?: string; lastPlayAt?: string | null }
}
interface BreakdownRow {
  label: string
  plays: number
  formattedCost?: string
}
const overall = computed<Overall | null>(() => (perfOverall.value as Overall) ?? null)

// Plays-first metrics (CV impressions/attention deferred until screens have cameras).
const overallPlays = computed(() => overall.value?.metrics?.totalPlays ?? 0)
const cpmPerKPlays = computed(() => {
  const spent = Number(c.value?.spentKobo ?? 0)
  return overallPlays.value > 0 ? Math.round((spent / overallPlays.value) * 1000) : 0
})
// Modeled reach (sensor-free) for this campaign, from the summaries endpoint.
const { data: campaignSummaries } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaign-summaries')),
  queryFn: getCampaignSummaries,
})
const estReach = computed(
  () => campaignSummaries.value?.campaigns.find((x) => x.campaignId === id.value)?.estimatedReach ?? 0,
)

// Creative preview for the sidebar. Carousels have no poster — lazily fetch the
// first image frame as a cover (same approach as the campaigns grid).
const creativeFmt = computed(
  () => (c.value?.creativeFormat ?? (c.value?.creative as { format?: string } | undefined)?.format) as
    | 'video'
    | 'image'
    | 'carousel'
    | undefined,
)
const carouselCover = ref<string | null>(null)
watch(
  c,
  (cam) => {
    carouselCover.value = null
    if (!cam || cam.posterUrl) return
    const f = cam.creativeFormat ?? (cam.creative as { format?: string } | undefined)?.format
    if (f !== 'carousel') return
    const cid = (cam.creative as { id?: string } | undefined)?.id
    if (!cid) return
    getCarousel(cid)
      .then((res) => {
        const items = (res.items ?? []) as Array<{ cdnUrl?: string | null; format: string }>
        const first = items.find((i) => i.cdnUrl && i.format === 'image') ?? items.find((i) => i.cdnUrl)
        carouselCover.value = first?.cdnUrl ?? null
      })
      .catch(() => {})
  },
  { immediate: true },
)
const coverUrl = computed(() => c.value?.posterUrl || carouselCover.value || null)
const daysLeft = computed(() =>
  c.value?.endDate ? Math.max(0, Math.ceil((Date.parse(c.value.endDate) - Date.now()) / 86_400_000)) : null,
)

function formatHour(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric' })
}
function shortDate(d: string): string {
  const t = Date.parse(d)
  if (Number.isNaN(t)) return d
  return new Date(t).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

const rows = computed<BreakdownRow[]>(() => {
  if (!perf.value || tab.value === 'overall') return []
  const p = perf.value as { screens?: unknown[]; hours?: unknown[]; days?: unknown[] }
  const arr = (p.screens ?? p.hours ?? p.days ?? []) as Array<Record<string, unknown>>
  return arr.map((r) => ({
    label: (r.screenName as string) ?? (r.hour ? formatHour(r.hour as string) : (r.date as string)) ?? '—',
    plays: (r.plays as number) ?? 0,
    formattedCost: r.formattedCost as string | undefined,
  }))
})

const pacingTone = computed(() => {
  const s = overall.value?.pacing?.status
  if (s === 'ahead') return 'info'
  if (s === 'behind') return 'danger'
  return 'success' // on_track / default
})
const breakdownColLabel = computed(() =>
  tab.value === 'by-screen' ? t('campaigns.perf.colScreen') : t('campaigns.perf.colWhen'),
)

async function run(fn: () => Promise<unknown>) {
  try {
    await fn()
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'campaign', id.value) })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Action failed')
  }
}
function onTopup() {
  const naira = Number(window.prompt('Top-up amount (₦)?') ?? '')
  if (naira > 0) run(() => topUpCampaign(id.value, String(nairaToKobo(naira)), 'topup-' + Date.now()))
}
function onExtend() {
  const d = window.prompt('New end date (YYYY-MM-DD)?')
  if (d) run(() => extendCampaign(id.value, new Date(`${d}T00:00:00Z`).toISOString()))
}
async function onClone() {
  try {
    const clone = await cloneCampaign(id.value)
    router.push(`/campaigns/${clone.id}`)
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Clone failed')
  }
}
</script>

<template>
  <div v-if="c">
    <!-- Header -->
    <div class="mb-6 min-w-0">
      <RouterLink to="/campaigns" class="mb-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-clay-600">
        <PhArrowLeft :size="13" /> {{ $t('nav.campaigns') }}
      </RouterLink>
      <h1 class="font-body text-3xl font-bold leading-none tracking-tight text-neutral-900 sm:text-4xl">
        {{ c.name }}
      </h1>
      <div class="mt-2.5 flex flex-wrap items-center gap-2">
        <Badge :tone="statusTone(c.status)" dot>{{ statusLabel(c.status) }}</Badge>
        <span class="text-sm capitalize text-neutral-500">{{ c.objective }}</span>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
      <!-- ── MAIN ─────────────────────────────────────────────── -->
      <div class="space-y-5 lg:col-span-2">
        <!-- Performance tabs -->
        <Card padding="none" class="overflow-hidden">
          <div class="px-5 pt-1">
            <Tabs v-model="tab" :tabs="perfTabs" />
          </div>
          <div class="p-5">
            <!-- Overall: headline tiles -->
            <template v-if="tab === 'overall'">
              <div v-if="overall" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricTile :label="$t('campaigns.perf.plays')" :value="overallPlays.toLocaleString('en-NG')" :icon="PhPlay" />
                <MetricTile :label="$t('campaigns.perf.estReach')" :value="estReach ? estReach.toLocaleString('en-NG') : '—'" :sub="$t('campaigns.perf.estReachHint')" :icon="PhUsersThree" />
                <MetricTile :label="$t('campaigns.perf.spend')" :value="formatKobo(c?.spentKobo ?? '0', { showDecimals: false })" :icon="PhCurrencyNgn" />
                <MetricTile :label="$t('campaigns.perf.cpmPlays')" :value="cpmPerKPlays ? formatKobo(String(cpmPerKPlays)) : '—'" :icon="PhChartLineUp" />
              </div>
              <p v-else class="py-6 text-center text-sm text-neutral-400">{{ $t('common.loading') }}</p>
            </template>

            <!-- Breakdown table (screen / hour / day) -->
            <template v-else>
              <div v-if="rows.length" class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="border-b border-line text-left text-[11px] uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th class="py-2 pr-3 font-semibold">{{ breakdownColLabel }}</th>
                      <th class="px-3 py-2 text-right font-semibold">{{ $t('campaigns.perf.colPlays') }}</th>
                      <th class="py-2 pl-3 text-right font-semibold">{{ $t('campaigns.perf.colCost') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in rows" :key="i" class="border-b border-line last:border-0">
                      <td class="py-2 pr-3 text-neutral-900">{{ r.label }}</td>
                      <td class="px-3 py-2 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.plays.toLocaleString('en-NG') }}</td>
                      <td class="py-2 pl-3 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.formattedCost ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="flex flex-col items-center py-8 text-center text-sm text-neutral-400">
                <MimuIcon name="dashboard" variant="sticker" :size="104" class="mb-2" />
                {{ $t('campaigns.perf.empty') }}
              </div>
            </template>
          </div>
        </Card>

        <!-- Offer -->
        <OfferCard :campaign-id="id" />

        <!-- Decision factors -->
        <Card>
          <h2 class="mb-4 font-body text-lg font-semibold text-neutral-900">{{ $t('campaigns.decisionFactors') }}</h2>
          <div v-if="factorList.length" class="space-y-3">
            <div v-for="(f, i) in factorList" :key="i">
              <div class="mb-1 flex justify-between text-xs">
                <span class="font-medium text-neutral-600">{{ f.label ?? f.name }}</span>
                <span class="font-display text-neutral-400">{{ Math.round((f.weight ?? f.value ?? 0) * 100) }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div class="h-full rounded-full bg-moss-400" :style="{ width: Math.round((f.weight ?? f.value ?? 0) * 100) + '%' }" />
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-neutral-400">{{ $t('common.comingSoon') }}</p>
        </Card>
      </div>

      <!-- ── SIDEBAR ──────────────────────────────────────────── -->
      <aside class="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <!-- Creative preview -->
        <Card padding="none" class="overflow-hidden">
          <div class="relative aspect-video bg-black">
            <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
            <video
              v-else-if="c.previewUrl && creativeFmt === 'video'"
              :src="`${c.previewUrl}#t=1`"
              muted
              playsinline
              preload="metadata"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-neutral-600"><PhFilmSlate :size="30" /></div>
            <span
              v-if="creativeFmt"
              class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm"
            >
              <PhStack v-if="creativeFmt === 'carousel'" :size="12" weight="fill" />
              <PhVideoCamera v-else-if="creativeFmt === 'video'" :size="12" weight="fill" />
              <PhImage v-else :size="12" weight="fill" />
              {{ creativeFmt }}
            </span>
          </div>
          <div v-if="c.creativeLabel" class="truncate px-3 py-2 text-xs text-neutral-500">{{ c.creativeLabel }}</div>
        </Card>

        <!-- Actions -->
        <Card v-if="session.canMutate">
          <div class="grid grid-cols-2 gap-2">
            <Button v-if="c.status === 'active'" size="sm" variant="secondary" class="col-span-2" @click="run(() => pauseCampaign(id))">{{ $t('campaigns.pause') }}</Button>
            <Button v-if="c.status === 'paused'" size="sm" variant="secondary" class="col-span-2" @click="run(() => resumeCampaign(id))">{{ $t('campaigns.resume') }}</Button>
            <Button size="sm" variant="secondary" @click="onTopup">{{ $t('campaigns.topup') }}</Button>
            <Button size="sm" variant="secondary" @click="onExtend">{{ $t('campaigns.extend') }}</Button>
            <Button size="sm" variant="outline" class="col-span-2" @click="onClone">{{ $t('campaigns.clone') }}</Button>
          </div>
        </Card>

        <!-- Pacing -->
        <Card>
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium text-neutral-700">{{ $t('campaigns.pacing') }}</span>
            <span class="font-display text-xs font-medium text-neutral-500">{{ pacing }}%</span>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div class="h-full rounded-full bg-clay-500 transition-all" :style="{ width: pacing + '%' }" />
          </div>
          <div class="mt-2.5 flex items-center justify-between gap-2 text-xs">
            <span class="font-display text-[13px] font-medium text-neutral-500">{{ formatKobo(c.spentKobo) }}<span class="text-neutral-300"> / </span>{{ formatKobo(c.budgetKobo) }}</span>
            <Badge :tone="pacingTone" size="sm" class="capitalize">{{ (overall?.pacing?.status ?? 'on track').replace(/_/g, ' ') }}</Badge>
          </div>
          <div v-if="overall?.pacing?.formattedExpectedSpend" class="mt-2 flex justify-between text-xs">
            <span class="text-neutral-500">{{ $t('campaigns.perf.expectedSpend') }}</span>
            <span class="font-display text-[13px] font-medium text-neutral-700">{{ overall.pacing.formattedExpectedSpend }}</span>
          </div>
        </Card>

        <!-- Details -->
        <Card>
          <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('campaigns.detailsTitle') }}</p>
          <dl class="space-y-2.5 text-sm">
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.status') }}</dt><dd><Badge :tone="statusTone(c.status)" size="sm">{{ statusLabel(c.status) }}</Badge></dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.objective') }}</dt><dd class="capitalize text-neutral-900">{{ c.objective }}</dd></div>
            <div v-if="creativeFmt" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.format') }}</dt><dd class="capitalize text-neutral-900">{{ creativeFmt }}</dd></div>
            <div v-if="c.screenCount != null" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('nav.screens') }}</dt><dd class="font-display text-[13px] font-medium text-neutral-900">{{ c.screenCount.toLocaleString('en-NG') }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.starts') }}</dt><dd class="text-neutral-900">{{ shortDate(c.startDate) }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.ends') }}</dt><dd class="text-neutral-900">{{ shortDate(c.endDate) }}</dd></div>
            <div v-if="daysLeft != null" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.daysRemaining') }}</dt><dd class="font-display text-[13px] font-medium text-neutral-900">{{ daysLeft }}</dd></div>
            <div v-if="c.formattedBidCpm" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.cpmRate') }}</dt><dd class="font-display text-[13px] font-medium text-neutral-900">{{ c.formattedBidCpm }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.created') }}</dt><dd class="text-neutral-900">{{ shortDate(c.createdAt) }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.lastPlay') }}</dt><dd class="text-neutral-900">{{ overall?.timeline?.lastPlayAt ? shortDate(overall.timeline.lastPlayAt) : $t('campaigns.perf.never') }}</dd></div>
          </dl>
        </Card>
      </aside>
    </div>
  </div>
</template>
