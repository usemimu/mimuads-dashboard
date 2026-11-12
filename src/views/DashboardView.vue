<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { PhMegaphone, PhSealCheck, PhMagnifyingGlass, PhWarningCircle, PhPlay, PhUsersThree, PhCurrencyNgn, PhMapPin, PhChartLineUp } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import TimeSeriesChart from '@/components/charts/TimeSeriesChart.vue'
import CampaignsTable from '@/components/dashboard/CampaignsTable.vue'
import InsightsPanel from '@/components/dashboard/InsightsPanel.vue'
import { useSession } from '@/stores/session'
import { useKyc } from '@/composables/useKyc'
import { getWallet } from '@/api/billing'
import { listCampaigns, getCampaignSummaries } from '@/api/campaigns'
import { getOrgSummary } from '@/api/org'
import { getScreensMap } from '@/api/screens'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import type { Campaign } from '@/api/contracts/campaigns'

const session = useSession()
const { kycComplete } = useKyc()

// ── Controls (table only) ────────────────────────────────────────────
const search = ref('')
const scope = ref<'all' | 'current' | 'archived'>('current')

// Lifetime window for the rollup — no user-facing period filter; headline
// numbers are totals-to-date, the trend shows the recent tail.
const LOOKBACK_DAYS = 3650

const CURRENT = new Set(['draft', 'pending_payment', 'pending_vetting', 'active', 'paused'])
const ARCHIVED = new Set(['completed', 'rejected', 'suspended'])

// ── Data ─────────────────────────────────────────────────────────────
const { data: wallet } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'wallet')),
  queryFn: getWallet,
})
const { data: campaigns } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaigns', 'all')),
  queryFn: () => listCampaigns({}),
})
const { data: screens } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'screens', 'dash')),
  queryFn: () => getScreensMap({}),
})
const { data: summary } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'reports', 'summary', 'lifetime')),
  queryFn: () => getOrgSummary(LOOKBACK_DAYS),
})
// Per-campaign plays (lifetime) for the dashboard table.
const { data: campaignSummaries } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'reports', 'campaign-summaries')),
  queryFn: getCampaignSummaries,
})
const playsByCampaign = computed(() => {
  const m: Record<string, number> = {}
  for (const c of campaignSummaries.value?.campaigns ?? []) m[c.campaignId] = c.totalPlays
  return m
})

const list = computed<Campaign[]>(() => campaigns.value?.campaigns ?? [])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return list.value.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false
    if (scope.value === 'current' && !CURRENT.has(c.status)) return false
    if (scope.value === 'archived' && !ARCHIVED.has(c.status)) return false
    return true
  })
})

// ── Metrics ──────────────────────────────────────────────────────────
function pluck(obj: unknown, keys: string[]): number {
  const o = obj as Record<string, unknown> | null
  if (!o) return 0
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  }
  return 0
}
type DayPoint = { day: string; plays: number; verifiedImpressions: number; deviceReach: number; spendKobo: string }
const totals = computed(() => (summary.value as { totals?: unknown } | undefined)?.totals ?? null)
const byDay = computed<DayPoint[]>(() => (summary.value as { byDay?: DayPoint[] } | undefined)?.byDay ?? [])

// Plays = ad playbacks (delivery truth, independent of any camera/sensor).
const plays = computed(() => pluck(totals.value, ['plays']))
// Estimated reach = modeled from venue footfall (effective daily reach of each
// screen-day the ad ran). Sensor-free; CV is deferred until screens get cameras.
const estimatedReach = computed(() => pluck(totals.value, ['estimatedReach']))
// Spend is campaign-sourced: the sum every campaign has actually spent to date.
const spendKobo = computed(() => list.value.reduce((sum, c) => sum + Number(c.spentKobo || 0), 0))
// Active campaigns, straight from the campaign list.
const activeCount = computed(() => list.value.filter((c) => c.status === 'active').length)
// Screens = full bookable inventory, matching the Screens page count (which
// lists all statuses, incl. pending_install). We're not yet gating on 'active'.
const screensCount = computed(() => (screens.value ?? []).length)
// Cost per 1,000 plays — a sensor-free efficiency metric.
const cpmKobo = computed(() => (plays.value > 0 ? Math.round((spendKobo.value / plays.value) * 1000) : 0))

// ── Chart: ad plays by day (recent tail of the real series) ──
function shortDate(d: string): string {
  const t = Date.parse(d)
  if (Number.isNaN(t)) return d
  return new Date(t).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}
// Continuous daily series ending TODAY — zero-fill days with no plays so the
// line always runs to the current date (UTC keys to match the backend's
// to_char(date_trunc('day', …)) grouping).
const CHART_DAYS = 30
const dailySeries = computed(() => {
  const map = new Map(byDay.value.map((d) => [d.day, d.plays]))
  const out: { day: string; plays: number }[] = []
  const now = new Date()
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const key = dt.toISOString().slice(0, 10)
    out.push({ day: key, plays: map.get(key) ?? 0 })
  }
  return out
})
const chartPoints = computed(() => dailySeries.value.map((d) => d.plays))
const chartLabels = computed(() => dailySeries.value.map((d) => shortDate(d.day)))

const lowBalance = computed(() => (wallet.value ? Number(wallet.value.balanceKobo) < 500_000_00 : false))
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <h1 class="font-body text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-neutral-900">{{ $t('nav.dashboard') }}</h1>
        <p class="page-subtitle mt-1">{{ $t('dashboard.overviewSub') }}</p>
      </div>
      <template v-if="session.canSubmitCampaign">
        <RouterLink v-if="kycComplete" to="/campaigns/new">
          <Button><PhMegaphone :size="18" /> {{ $t('dashboard.quickStart') }}</Button>
        </RouterLink>
        <RouterLink v-else to="/verify">
          <Button variant="outline"><PhSealCheck :size="18" /> {{ $t('verification.gateCta') }}</Button>
        </RouterLink>
      </template>
    </div>

    <!-- Low-balance nudge -->
    <RouterLink
      v-if="lowBalance"
      to="/billing"
      class="mb-5 flex items-center gap-2 rounded-lg border border-gold-200/60 bg-gold-50 px-4 py-2.5 text-sm text-gold-800 hover:bg-gold-100/60"
    >
      <PhWarningCircle :size="18" weight="fill" class="text-gold-500" />
      {{ $t('dashboard.lowBalance') }}
    </RouterLink>

    <!-- ── Performance region (X-Ads style): a single framed block that owns the
         period control, the headline metrics, and the trend chart. ── -->
    <section class="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
            <PhChartLineUp :size="18" weight="bold" />
          </span>
          <h2 class="text-[15px] font-bold tracking-tight text-neutral-900">{{ $t('dashboard.performance') }}</h2>
        </div>
        <span class="text-xs font-medium text-neutral-400">{{ $t('dashboard.toDate') }}</span>
      </div>

      <!-- Headline metrics: a flush row of divided cells so the baseline aligns. -->
      <div class="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        <MetricTile bare :label="$t('dashboard.mPlays')" :value="plays.toLocaleString('en-NG')" :icon="PhPlay" />
        <MetricTile bare :label="$t('dashboard.mReach')" :value="estimatedReach ? estimatedReach.toLocaleString('en-NG') : '—'" :sub="$t('dashboard.mReachHint')" :icon="PhUsersThree" />
        <MetricTile bare :label="$t('dashboard.mSpend')" :value="formatKobo(String(spendKobo), { showDecimals: false })" :icon="PhCurrencyNgn" />
        <MetricTile bare :label="$t('dashboard.mCpm')" :value="cpmKobo ? formatKobo(String(cpmKobo)) : '—'" :icon="PhChartLineUp" />
        <MetricTile bare :label="$t('dashboard.mActive')" :value="activeCount" :icon="PhMegaphone" />
        <MetricTile bare :label="$t('dashboard.mScreens')" :value="screensCount" :icon="PhMapPin" />
      </div>

      <!-- Trend chart, sharing the same frame. -->
      <div class="border-t border-line p-5">
        <p class="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ $t('dashboard.chartTitle') }}</p>
        <TimeSeriesChart :points="chartPoints" :labels="chartLabels" :empty="$t('dashboard.noData')" unit="plays" />
      </div>
    </section>

    <!-- ── Campaigns + insights ── -->
    <div class="mt-6 flex flex-wrap items-center gap-2">
      <h2 class="mr-auto text-sm font-semibold text-neutral-900">{{ $t('nav.campaigns') }}</h2>
      <div class="relative min-w-[12rem]">
        <PhMagnifyingGlass :size="15" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" :placeholder="$t('dashboard.searchPlaceholder')" class="input py-1.5 pl-8 text-sm" />
      </div>
      <div class="flex rounded-full border border-line-strong bg-surface p-0.5">
        <button
          v-for="opt in (['current', 'archived', 'all'] as const)"
          :key="opt"
          class="rounded-full px-3 py-1 text-sm capitalize transition-colors"
          :class="scope === opt ? 'bg-clay-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'"
          @click="scope = opt"
        >
          {{ $t('dashboard.scope' + opt.charAt(0).toUpperCase() + opt.slice(1)) }}
        </button>
      </div>
    </div>

    <div class="mt-3 grid gap-5 lg:grid-cols-5">
      <Card class="lg:col-span-3" padding="sm">
        <CampaignsTable :campaigns="filtered" :plays-by-campaign="playsByCampaign" :empty-text="$t('dashboard.noMatch')" />
      </Card>
      <Card class="lg:col-span-2">
        <InsightsPanel :campaigns="filtered" :empty-text="$t('dashboard.insightsEmpty')" />
      </Card>
    </div>
  </div>
</template>
