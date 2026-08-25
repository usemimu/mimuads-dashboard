<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { PhMegaphone, PhSealCheck, PhMagnifyingGlass, PhWarningCircle } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import TimeSeriesChart from '@/components/charts/TimeSeriesChart.vue'
import CampaignsTable from '@/components/dashboard/CampaignsTable.vue'
import InsightsPanel from '@/components/dashboard/InsightsPanel.vue'
import { useSession } from '@/stores/session'
import { useKyc } from '@/composables/useKyc'
import { getWallet } from '@/api/billing'
import { listCampaigns } from '@/api/campaigns'
import { getOrgSummary } from '@/api/org'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import type { Campaign } from '@/api/contracts/campaigns'

const session = useSession()
const { kycComplete } = useKyc()

// ── Controls ─────────────────────────────────────────────────────────
const search = ref('')
const scope = ref<'all' | 'current' | 'archived'>('current')
const period = ref(30) // days

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
const { data: summary } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'reports', 'summary', String(period.value))),
  queryFn: () => getOrgSummary(period.value),
})

const list = computed<Campaign[]>(() => campaigns.value?.campaigns ?? [])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const cutoff = Date.now() - period.value * 86_400_000
  return list.value.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false
    if (scope.value === 'current' && !CURRENT.has(c.status)) return false
    if (scope.value === 'archived' && !ARCHIVED.has(c.status)) return false
    if (c.createdAt && Date.parse(c.createdAt) < cutoff) return false
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
// Real numbers from the CV plays pipeline (org/reports/summary): verified
// impressions, plays, and attributed spend over the selected period.
type DayPoint = { day: string; plays: number; verifiedImpressions: number; spendKobo: string }
const totals = computed(() => (summary.value as { totals?: unknown } | undefined)?.totals ?? null)
const byDay = computed<DayPoint[]>(() => (summary.value as { byDay?: DayPoint[] } | undefined)?.byDay ?? [])

const impressions = computed(() => pluck(totals.value, ['verifiedImpressions', 'plays']))
const spendKobo = computed(
  () => pluck(totals.value, ['attributedSpendKobo']) || filtered.value.reduce((sum, c) => sum + Number(c.spentKobo || 0), 0),
)
const activeCount = computed(() => filtered.value.filter((c) => c.status === 'active').length)
const screensLive = computed(() =>
  filtered.value.filter((c) => c.status === 'active').reduce((sum, c) => sum + (c.screenCount ?? 0), 0),
)
const cpmKobo = computed(() => (impressions.value > 0 ? Math.round((spendKobo.value / impressions.value) * 1000) : 0))

// ── Chart: verified impressions by day (real time series from the plays data) ──
function shortDate(d: string): string {
  const t = Date.parse(d)
  if (Number.isNaN(t)) return d
  return new Date(t).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}
const chartPoints = computed(() => byDay.value.map((d) => d.verifiedImpressions))
const chartLabels = computed(() => byDay.value.map((d) => shortDate(d.day)))

const lowBalance = computed(() => (wallet.value ? Number(wallet.value.balanceKobo) < 500_000_00 : false))
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <h1 class="page-title">{{ $t('nav.dashboard') }}</h1>
        <p class="page-subtitle mt-0.5">{{ $t('dashboard.overviewSub') }}</p>
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

    <!-- Controls -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <div class="relative min-w-[12rem] flex-1">
        <PhMagnifyingGlass :size="15" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" :placeholder="$t('dashboard.searchPlaceholder')" class="input py-1.5 pl-8 text-sm" />
      </div>
      <div class="flex overflow-hidden rounded-lg border border-line-strong">
        <button
          v-for="opt in (['current', 'archived', 'all'] as const)"
          :key="opt"
          class="px-3 py-1.5 text-sm capitalize"
          :class="scope === opt ? 'bg-clay-50 text-clay-700' : 'text-neutral-600 hover:bg-neutral-50'"
          @click="scope = opt"
        >
          {{ $t('dashboard.scope' + opt.charAt(0).toUpperCase() + opt.slice(1)) }}
        </button>
      </div>
      <select v-model.number="period" :aria-label="$t('reports.period')" class="select w-auto py-1.5 text-sm">
        <option :value="7">{{ $t('reports.days7') }}</option>
        <option :value="30">{{ $t('reports.days30') }}</option>
        <option :value="90">{{ $t('reports.days90') }}</option>
      </select>
    </div>

    <!-- Metrics row -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <MetricTile :label="$t('dashboard.mImpressions')" :value="impressions.toLocaleString('en-NG')" />
      <MetricTile :label="$t('dashboard.mSpend')" :value="formatKobo(String(spendKobo), { showDecimals: false })" />
      <MetricTile :label="$t('dashboard.mActive')" :value="activeCount" />
      <MetricTile :label="$t('dashboard.mScreens')" :value="screensLive" />
      <MetricTile :label="$t('dashboard.mCpm')" :value="cpmKobo ? formatKobo(String(cpmKobo)) : '—'" />
    </div>

    <!-- Chart -->
    <Card class="mt-5">
      <p class="mb-4 text-sm font-semibold text-neutral-900">{{ $t('dashboard.chartTitle') }}</p>
      <TimeSeriesChart :points="chartPoints" :labels="chartLabels" :empty="$t('dashboard.noData')" />
    </Card>

    <!-- Table + insights -->
    <div class="mt-5 grid gap-5 lg:grid-cols-5">
      <Card class="lg:col-span-3" padding="sm">
        <CampaignsTable :campaigns="filtered" :empty-text="$t('dashboard.noMatch')" />
      </Card>
      <Card class="lg:col-span-2">
        <InsightsPanel :campaigns="filtered" :empty-text="$t('dashboard.insightsEmpty')" />
      </Card>
    </div>
  </div>
</template>
