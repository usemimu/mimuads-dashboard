<script setup lang="ts">
import { computed } from 'vue'
import { PhUsersThree } from '@phosphor-icons/vue'
import Gauge from '@/components/ui/Gauge.vue'
import { formatKobo } from '@/lib/money'
import type { QuoteResponse } from '@/api/contracts/campaigns'

/**
 * Right-rail Estimate panel — budget-first, DOOH-style. Leads with what YOUR
 * budget buys (impressions · unique reach · frequency), then shows the spend and
 * a Narrow↔Broad breadth gauge. "Full delivery" (saturating the selection over
 * the whole flight) is the secondary figure. When the budget is below full
 * delivery the numbers scale down (`budget ÷ net`) — that's normal in DOOH, not
 * an error. Placeholder until there's enough targeting to price a quote.
 */
const props = defineProps<{
  quote: QuoteResponse | null | undefined
  loading: boolean
  ready: boolean
  breadth: number
  /** The advertiser's total budget in kobo (null until they enter one). */
  budgetKobo: number | null
}>()

const fmt = (n: number) => Math.round(n).toLocaleString('en-NG')

const net = computed(() => (props.quote ? Number(props.quote.netKobo) : 0))
// How much of full delivery the budget funds. No budget yet → assume full.
const fraction = computed(() => {
  if (props.budgetKobo == null || net.value <= 0) return 1
  return Math.min(1, props.budgetKobo / net.value)
})
const impressions = computed(() => Math.round((props.quote?.estimatedImpressions ?? 0) * fraction.value))
const reach = computed(() => props.quote?.estimatedReach ?? 0)
// Total impressions ÷ daily unique reach ≈ how many times each person sees it.
const frequency = computed(() => (reach.value > 0 ? impressions.value / reach.value : 0))
const spendKobo = computed(() =>
  props.budgetKobo == null ? net.value : Math.min(props.budgetKobo, net.value),
)
const underDelivers = computed(() => props.budgetKobo != null && props.budgetKobo < net.value)

// ±10% band reads as a range.
const range = computed(() =>
  impressions.value ? { low: fmt(impressions.value * 0.9), high: fmt(impressions.value * 1.1) } : null,
)
</script>

<template>
  <div class="rounded-xl border border-line bg-surface p-4 shadow-card" data-testid="estimate">
    <div class="mb-3 flex items-center gap-2">
      <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-clay-500">
        <PhUsersThree :size="16" />
      </span>
      <p class="text-[13px] font-semibold text-neutral-900">{{ $t('wizard.estimate.title') }}</p>
    </div>

    <!-- Not enough to price yet -->
    <p v-if="!ready" class="text-sm text-neutral-400">{{ $t('wizard.estimate.empty') }}</p>

    <template v-else>
      <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {{ budgetKobo != null ? $t('wizard.estimate.forBudget') : $t('wizard.estimate.audience') }}
      </p>
      <p v-if="loading" class="mt-1 font-display text-2xl text-neutral-300">{{ $t('campaigns.quoteLoading') }}</p>
      <p v-else-if="range" class="mt-1 font-display text-2xl font-semibold text-neutral-900 [font-variant-numeric:tabular-nums]">
        {{ range.low }}<span class="text-neutral-400">–</span>{{ range.high }}
      </p>
      <p v-else class="mt-1 font-display text-2xl text-neutral-300">—</p>
      <p class="text-[11px] text-neutral-400">{{ $t('wizard.estimate.impressionsOver') }}</p>

      <!-- Reach + frequency -->
      <div v-if="quote && reach" class="mt-3 grid grid-cols-2 gap-2">
        <div class="rounded-lg bg-neutral-50 p-2.5">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{{ $t('wizard.estimate.reach') }}</p>
          <p class="mt-0.5 font-mono text-sm font-semibold text-neutral-900">{{ fmt(reach) }}</p>
        </div>
        <div class="rounded-lg bg-neutral-50 p-2.5">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{{ $t('wizard.estimate.frequency') }}</p>
          <p class="mt-0.5 font-mono text-sm font-semibold text-neutral-900">{{ frequency.toFixed(1) }}×</p>
        </div>
      </div>

      <div class="mt-4">
        <Gauge
          :value="breadth"
          :low-label="$t('wizard.estimate.narrow')"
          :high-label="$t('wizard.estimate.broad')"
        />
      </div>

      <dl v-if="quote" class="mt-4 space-y-2 border-t border-line pt-3 text-sm">
        <div class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('wizard.estimate.youPay') }}</dt>
          <dd class="font-mono font-semibold text-clay-700">{{ formatKobo(String(spendKobo)) }}</dd>
        </div>
        <div v-if="quote.discountPct" class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('campaigns.quoteDiscount') }}</dt>
          <dd class="font-mono text-moss-600">{{ quote.discountPct }}%</dd>
        </div>
        <!-- Committed rate: the CPM (kobo) locked onto the campaign at submit —
             the exact number the detail view + billing show. Falls back to the
             legacy naira CPM only if an older backend omits bidCpmKobo. -->
        <div class="flex items-center justify-between">
          <dt class="text-neutral-500">{{ $t('wizard.estimate.cpm') }}</dt>
          <dd class="font-mono text-neutral-700">
            {{ quote.bidCpmKobo ? formatKobo(quote.bidCpmKobo) : formatKobo(Math.round(quote.costPerThousandImpressions)) }}
          </dd>
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

      <!-- Budget below full delivery: normal in DOOH — explain, don't alarm.
           Also the honest caveat that reach is a set value today. -->
      <p v-if="quote && underDelivers" class="mt-3 rounded-lg bg-neutral-50 px-2.5 py-2 text-[11px] leading-relaxed text-neutral-500">
        {{ $t('wizard.estimate.partial', { pct: Math.round(fraction * 100) }) }}
        <span class="text-neutral-400">{{ $t('wizard.estimate.fullDelivery', { cost: formatKobo(quote.netKobo, { showDecimals: false }) }) }}</span>
      </p>
      <p v-else-if="quote" class="mt-3 text-[11px] leading-relaxed text-neutral-400">
        {{ $t('wizard.estimate.refundNote') }}
      </p>
    </template>
  </div>
</template>
