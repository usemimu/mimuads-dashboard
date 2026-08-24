<script setup lang="ts">
import { computed } from 'vue'
import { formatKobo } from '@/lib/money'
import type { Campaign } from '@/api/contracts/campaigns'

/**
 * Dashboard "insights" — the OOH stand-in for X's Audience Insights, built from
 * data we actually have: spend share by objective. (Real per-location / daypart
 * insight needs a backend rollup that doesn't exist yet — until then this reads
 * spend by campaign goal.)
 */
const props = defineProps<{ campaigns: Campaign[]; emptyText: string }>()

const rows = computed(() => {
  const by = new Map<string, number>()
  for (const c of props.campaigns) {
    by.set(c.objective, (by.get(c.objective) ?? 0) + Number(c.spentKobo || 0))
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0)
  return [...by.entries()]
    .map(([objective, spend]) => ({ objective, spend, pct: total ? Math.round((spend / total) * 100) : 0 }))
    .sort((a, b) => b.spend - a.spend)
})

const hasSpend = computed(() => rows.value.some((r) => r.spend > 0))
</script>

<template>
  <div>
    <p class="mb-1 text-sm font-semibold text-neutral-900">{{ $t('dashboard.insightsTitle') }}</p>
    <p class="mb-4 text-xs text-neutral-400">{{ $t('dashboard.insightsSub') }}</p>

    <p v-if="!hasSpend" class="py-8 text-center text-sm text-neutral-400">{{ emptyText }}</p>

    <ul v-else class="space-y-3">
      <li v-for="r in rows" :key="r.objective">
        <div class="mb-1 flex items-center justify-between text-sm">
          <span class="capitalize text-neutral-700">{{ $t('campaigns.objectives.' + r.objective) }}</span>
          <span class="font-mono text-neutral-500">{{ formatKobo(String(r.spend), { showDecimals: false }) }}</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div class="h-full rounded-full bg-clay-500" :style="{ width: r.pct + '%' }" />
        </div>
      </li>
    </ul>
  </div>
</template>
