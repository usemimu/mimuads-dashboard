<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhDownloadSimple } from '@phosphor-icons/vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
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

const { data: summary } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'org-summary', period.value)),
  queryFn: () => getOrgSummary(period.value) as Promise<{
    totals?: Record<string, unknown>
    byWorkspace?: Array<Record<string, unknown>>
  }>,
})
const { data: campaigns } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'report-campaigns')),
  queryFn: () => listCampaigns({}),
})

const byWorkspace = computed(() => summary.value?.byWorkspace ?? [])
const kobo = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? formatKobo(String(v)) : '—')
</script>

<template>
  <div>
    <PageHeader :title="$t('reports.title')">
      <template #actions>
        <select v-model.number="period" :aria-label="$t('reports.period')" class="select max-w-[11rem] text-sm">
          <option :value="7">{{ $t('reports.days7') }}</option>
          <option :value="30">{{ $t('reports.days30') }}</option>
          <option :value="90">{{ $t('reports.days90') }}</option>
        </select>
      </template>
    </PageHeader>

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
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ w.verifiedViews ?? w.plays ?? '—' }}</td>
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
