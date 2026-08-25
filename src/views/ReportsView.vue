<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhDownloadSimple } from '@phosphor-icons/vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import TimeSeriesChart from '@/components/charts/TimeSeriesChart.vue'
import { useSession } from '@/stores/session'
import { getOrgSummary, campaignExportUrl } from '@/api/org'
import { listCampaigns } from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { statusTone, statusLabel } from '@/lib/status'

/**
 * Cross-campaign reporting + exports (§4.5). Org rollup (per-workspace) from
 * /reports/org/summary; per-campaign CSV/PDF export links (server-rendered).
 */
const session = useSession()
const period = ref(30)

type DayPoint = { day: string; plays: number; verifiedImpressions: number; spendKobo: string }
const { data: summary } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'org-summary', period.value)),
  queryFn: () => getOrgSummary(period.value) as Promise<{
    totals?: Record<string, unknown>
    byDay?: DayPoint[]
    byWorkspace?: Array<Record<string, unknown>>
  }>,
})
const { data: campaigns } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'report-campaigns')),
  queryFn: () => listCampaigns({}),
})

const byWorkspace = computed(() => summary.value?.byWorkspace ?? [])
const kobo = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? formatKobo(String(v)) : '—')

// Metric strip over the period totals (falls back to the campaigns rollup).
function pluck(obj: unknown, keys: string[]): number {
  const o = obj as Record<string, unknown> | null | undefined
  if (!o) return 0
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  }
  return 0
}
const campaignList = computed(() => campaigns.value?.campaigns ?? [])
const totalSpendKobo = computed(
  () =>
    pluck(summary.value?.totals, ['attributedSpendKobo', 'spendKobo']) ||
    campaignList.value.reduce((s, c) => s + Number(c.spentKobo || 0), 0),
)
const verifiedViews = computed(() => pluck(summary.value?.totals, ['verifiedImpressions', 'plays']))

// Daily trend (verified impressions) from the plays pipeline — same series the
// dashboard chart uses, scoped to the selected period.
function shortDate(d: string): string {
  const t = Date.parse(d)
  if (Number.isNaN(t)) return d
  return new Date(t).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}
const byDay = computed<DayPoint[]>(() => summary.value?.byDay ?? [])
const chartPoints = computed(() => byDay.value.map((d) => d.verifiedImpressions))
const chartLabels = computed(() => byDay.value.map((d) => shortDate(d.day)))
</script>

<template>
  <div>
    <PageHeader :title="$t('reports.title')" :subtitle="$t('reports.subtitle')">
      <template #actions>
        <select v-model.number="period" :aria-label="$t('reports.period')" class="select max-w-[11rem] text-sm">
          <option :value="7">{{ $t('reports.days7') }}</option>
          <option :value="30">{{ $t('reports.days30') }}</option>
          <option :value="90">{{ $t('reports.days90') }}</option>
        </select>
      </template>
    </PageHeader>

    <!-- Metric strip -->
    <div class="mb-6 grid grid-cols-3 gap-4">
      <MetricTile :label="$t('reports.spend')" :value="formatKobo(String(totalSpendKobo), { showDecimals: false })" />
      <MetricTile :label="$t('reports.verifiedViews')" :value="verifiedViews.toLocaleString('en-NG')" />
      <MetricTile :label="$t('reports.campaigns')" :value="campaignList.length" />
    </div>

    <!-- Trend -->
    <Card class="mb-6">
      <p class="mb-4 text-sm font-semibold text-neutral-900">{{ $t('reports.trendTitle') }}</p>
      <TimeSeriesChart :points="chartPoints" :labels="chartLabels" :empty="$t('dashboard.noData')" />
    </Card>

    <!-- Per-workspace rollup (agencies) -->
    <Card v-if="byWorkspace.length" padding="none" class="mb-6 overflow-hidden">
      <div class="border-b border-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-900">{{ $t('reports.perWorkspace') }}</div>
      <table class="w-full text-sm">
        <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-400">
          <tr class="border-b border-neutral-100">
            <th class="px-5 py-3 font-semibold">{{ $t('reports.workspace') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('reports.spend') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('reports.verifiedViews') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(w, i) in byWorkspace" :key="i" class="border-t border-neutral-100">
            <td class="px-5 py-3 text-neutral-900">{{ w.workspaceName ?? w.name ?? w.workspaceId ?? '—' }}</td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ kobo(w.spendKobo ?? w.spend) }}</td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ w.verifiedImpressions ?? w.plays ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </Card>

    <!-- Cross-campaign table + exports -->
    <Card padding="none" class="overflow-hidden">
      <div class="border-b border-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-900">{{ $t('reports.campaigns') }}</div>
      <table class="w-full text-sm">
        <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-400">
          <tr class="border-b border-neutral-100">
            <th class="px-5 py-3 font-semibold">{{ $t('campaigns.name') }}</th>
            <th class="px-5 py-3 font-semibold">{{ $t('campaigns.status') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('reports.spend') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('reports.exportCsv') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in campaigns?.campaigns ?? []" :key="c.id" class="border-t border-neutral-100 hover:bg-neutral-50/70">
            <td class="px-5 py-3 text-neutral-900">{{ c.name }}</td>
            <td class="px-5 py-3"><Badge :tone="statusTone(c.status)">{{ statusLabel(c.status) }}</Badge></td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ formatKobo(c.spentKobo) }}</td>
            <td class="px-5 py-3 text-right">
              <a :href="campaignExportUrl(c.id, 'csv')" target="_blank" rel="noopener" class="font-medium text-clay-600 hover:underline"><PhDownloadSimple :size="14" class="inline" /> CSV</a>
              <a :href="campaignExportUrl(c.id, 'pdf')" target="_blank" rel="noopener" class="ml-3 font-medium text-clay-600 hover:underline">PDF</a>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>
