<script setup lang="ts">
import { computed } from 'vue'
import { PhUsersThree } from '@phosphor-icons/vue'
import Gauge from '@/components/ui/Gauge.vue'
import { formatKobo } from '@/lib/money'
import type { QuoteResponse } from '@/api/contracts/campaigns'

/**
 * Right-rail Estimate panel — the OOH take on X's "Audience size" box. Shows an
 * impressions range, a Narrow↔Broad breadth gauge, and the priced quote
 * (net, CPM, duration, screens). Placeholder until there's enough targeting to
 * price a quote.
 */
const props = defineProps<{
  quote: QuoteResponse | null | undefined
  loading: boolean
  ready: boolean
  breadth: number
}>()

const fmt = (n: number) => Math.round(n).toLocaleString('en-NG')

// ±10% band around the point estimate reads as a range, like X's "7.5m–8.5m".
const range = computed(() => {
  const est = props.quote?.estimatedImpressions ?? 0
  if (!est) return null
  return { low: fmt(est * 0.9), high: fmt(est * 1.1) }
})
</script>

<template>
  <div class="rounded-xl border border-line bg-white p-4 shadow-card" data-testid="estimate">
    <div class="mb-3 flex items-center gap-2">
      <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-50 text-clay-500">
        <PhUsersThree :size="16" />
      </span>
      <p class="text-[13px] font-semibold text-neutral-900">{{ $t('wizard.estimate.title') }}</p>
    </div>

    <!-- Not enough to price yet -->
    <p v-if="!ready" class="text-sm text-neutral-400">{{ $t('wizard.estimate.empty') }}</p>

    <template v-else>
      <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {{ $t('wizard.estimate.audience') }}
      </p>
      <p v-if="loading" class="mt-1 font-display text-2xl text-neutral-300">{{ $t('campaigns.quoteLoading') }}</p>
      <p v-else-if="range" class="mt-1 font-display text-2xl font-semibold text-neutral-900 [font-variant-numeric:tabular-nums]">
        {{ range.low }}<span class="text-neutral-400">–</span>{{ range.high }}
      </p>
      <p v-else class="mt-1 font-display text-2xl text-neutral-300">—</p>
      <p class="text-[11px] text-neutral-400">{{ $t('wizard.estimate.impressionsOver') }}</p>

      <div class="mt-4">
        <Gauge
          :value="breadth"
          :low-label="$t('wizard.estimate.narrow')"
          :high-label="$t('wizard.estimate.broad')"
        />
      </div>

      <dl v-if="quote" class="mt-4 space-y-2 border-t border-line pt-3 text-sm">
        <div class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('campaigns.quoteNet') }}</dt>
          <dd class="font-mono font-semibold text-clay-700">{{ formatKobo(quote.netKobo) }}</dd>
        </div>
        <div v-if="quote.discountPct" class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('campaigns.quoteDiscount') }}</dt>
          <dd class="font-mono text-moss-600">{{ quote.discountPct }}%</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('wizard.estimate.cpm') }}</dt>
          <dd class="font-mono text-neutral-700">{{ formatKobo(Math.round(quote.costPerThousandImpressions)) }}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('wizard.estimate.duration') }}</dt>
          <dd class="font-mono text-neutral-700">{{ quote.durationDays }}d</dd>
        </div>
        <div v-if="quote.totalScreens != null" class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('wizard.estimate.screens') }}</dt>
          <dd class="font-mono text-neutral-700">{{ quote.totalScreens }}</dd>
        </div>
      </dl>
    </template>
  </div>
</template>
