<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatKobo } from '@/lib/money'
import { statusTone, statusLabel } from '@/lib/status'
import Badge from '@/components/ui/Badge.vue'
import type { Campaign } from '@/api/contracts/campaigns'

/** Dashboard campaigns table (X's campaign list) with a graceful empty state. */
const props = withDefaults(
  defineProps<{ campaigns: Campaign[]; emptyText: string; playsByCampaign?: Record<string, number> }>(),
  { playsByCampaign: () => ({}) },
)
function playsFor(id: string): number {
  return props.playsByCampaign[id] ?? 0
}

function pacing(c: Campaign): number {
  const budget = Number(c.budgetKobo)
  if (!budget) return 0
  return Math.min(100, Math.round((Number(c.spentKobo) / budget) * 100))
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="border-b border-line text-left text-[11px] uppercase tracking-wide text-neutral-400">
        <tr>
          <th class="px-3 py-2 font-semibold">{{ $t('campaigns.title') }}</th>
          <th class="px-3 py-2 font-semibold">{{ $t('dashboard.colStatus') }}</th>
          <th class="px-3 py-2 text-right font-semibold">{{ $t('dashboard.colPlays') }}</th>
          <th class="px-3 py-2 text-right font-semibold">{{ $t('dashboard.colBudget') }}</th>
          <th class="px-3 py-2 text-right font-semibold">{{ $t('dashboard.colSpent') }}</th>
          <th class="px-3 py-2 font-semibold">{{ $t('dashboard.colPacing') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!campaigns.length">
          <td colspan="6" class="px-3 py-10 text-center text-sm text-neutral-400">{{ emptyText }}</td>
        </tr>
        <tr
          v-for="c in campaigns"
          :key="c.id"
          class="border-b border-line last:border-0 hover:bg-neutral-50/60"
        >
          <td class="px-3 py-2.5">
            <RouterLink :to="`/campaigns/${c.id}`" class="font-medium text-neutral-900 hover:text-clay-600">
              {{ c.name }}
            </RouterLink>
            <p class="text-xs capitalize text-neutral-400">{{ c.objective }}</p>
          </td>
          <td class="px-3 py-2.5"><Badge :tone="statusTone(c.status)" size="sm">{{ statusLabel(c.status) }}</Badge></td>
          <td class="px-3 py-2.5 text-right font-display text-[13px] font-medium text-neutral-700">{{ playsFor(c.id).toLocaleString('en-NG') }}</td>
          <td class="px-3 py-2.5 text-right font-display text-[13px] font-medium text-neutral-700">{{ formatKobo(c.budgetKobo, { showDecimals: false }) }}</td>
          <td class="px-3 py-2.5 text-right font-display text-[13px] font-medium text-neutral-700">{{ formatKobo(c.spentKobo, { showDecimals: false }) }}</td>
          <td class="px-3 py-2.5">
            <div class="flex items-center gap-2">
              <div class="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100">
                <div class="h-full rounded-full bg-clay-500" :style="{ width: pacing(c) + '%' }" />
              </div>
              <span class="font-display text-xs font-medium text-neutral-500">{{ pacing(c) }}%</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
