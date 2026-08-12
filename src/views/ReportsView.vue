<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhDownloadSimple } from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'
import { getOrgSummary, campaignExportUrl } from '@/api/org'
import { listCampaigns } from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'

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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ $t('reports.title') }}</h1>
      <select v-model.number="period" :aria-label="$t('reports.period')" class="rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400">
        <option :value="7">{{ $t('reports.days7') }}</option>
        <option :value="30">{{ $t('reports.days30') }}</option>
        <option :value="90">{{ $t('reports.days90') }}</option>
      </select>
    </div>

    <!-- Per-workspace rollup (agencies) -->
    <div v-if="byWorkspace.length" class="mb-6 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div class="border-b border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700">{{ $t('reports.perWorkspace') }}</div>
      <table class="w-full text-sm">
        <thead class="text-left text-xs uppercase tracking-wide text-neutral-400">
          <tr><th class="px-4 py-2">{{ $t('reports.workspace') }}</th><th class="px-4 py-2">{{ $t('reports.spend') }}</th><th class="px-4 py-2">{{ $t('reports.verifiedViews') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(w, i) in byWorkspace" :key="i" class="border-t border-neutral-100">
            <td class="px-4 py-2 text-neutral-900">{{ w.workspaceName ?? w.name ?? w.workspaceId ?? '—' }}</td>
            <td class="px-4 py-2 font-mono">{{ kobo(w.spendKobo ?? w.spend) }}</td>
            <td class="px-4 py-2 font-mono">{{ w.verifiedViews ?? w.plays ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cross-campaign table + exports -->
    <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div class="border-b border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700">{{ $t('reports.campaigns') }}</div>
      <table class="w-full text-sm">
        <thead class="text-left text-xs uppercase tracking-wide text-neutral-400">
          <tr><th class="px-4 py-2">{{ $t('campaigns.name') }}</th><th class="px-4 py-2">{{ $t('campaigns.status') }}</th><th class="px-4 py-2">{{ $t('reports.spend') }}</th><th class="px-4 py-2 text-right">{{ $t('reports.exportCsv') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in campaigns?.campaigns ?? []" :key="c.id" class="border-t border-neutral-100">
            <td class="px-4 py-2 text-neutral-900">{{ c.name }}</td>
            <td class="px-4 py-2 capitalize text-neutral-500">{{ c.status.replace(/_/g, ' ') }}</td>
            <td class="px-4 py-2 font-mono">{{ formatKobo(c.spentKobo) }}</td>
            <td class="px-4 py-2 text-right">
              <a :href="campaignExportUrl(c.id, 'csv')" target="_blank" rel="noopener" class="text-clay-600 hover:underline"><PhDownloadSimple :size="14" class="inline" /> CSV</a>
              <a :href="campaignExportUrl(c.id, 'pdf')" target="_blank" rel="noopener" class="ml-3 text-clay-600 hover:underline">PDF</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
