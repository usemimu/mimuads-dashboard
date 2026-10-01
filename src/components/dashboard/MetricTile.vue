<script setup lang="ts">
/**
 * KPI tile for the dashboard metrics row (X's Impressions / Spend / … cells),
 * upgraded to the "Stats" pattern: an optional clay icon chip + an optional
 * signed delta badge. Value auto-fits its width via container queries so long
 * money values never overflow. Icon/delta are optional — existing callers that
 * pass only label+value keep their look.
 */
import type { Component } from 'vue'
import { PhArrowUp, PhArrowDown } from '@phosphor-icons/vue'

withDefaults(
  defineProps<{
    label: string
    value: string | number
    sub?: string
    active?: boolean
    icon?: Component
    /** Signed period-over-period change (%). Positive = up (moss), negative = down (red). */
    delta?: number
    /** Flush cell — no border/rounding/shadow, for use inside a framed divided grid. */
    bare?: boolean
  }>(),
  { active: false, bare: false },
)
</script>

<template>
  <div
    class="[container-type:inline-size]"
    :class="[
      bare ? 'bg-transparent p-5' : 'rounded-xl border bg-surface p-4 shadow-card',
      !bare && active ? 'border-clay-300 ring-1 ring-clay-500/20' : '',
      !bare && !active ? 'border-line' : '',
    ]"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="eyebrow">{{ label }}</p>
      <span
        v-if="icon"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600"
      >
        <component :is="icon" :size="18" weight="bold" />
      </span>
    </div>
    <div class="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p
        class="whitespace-nowrap font-mono text-[clamp(1.125rem,14cqi,2.25rem)] font-bold leading-none tracking-tight text-neutral-900 [font-variant-numeric:tabular-nums]"
      >
        {{ value }}
      </p>
      <span
        v-if="delta != null"
        class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold"
        :class="delta >= 0 ? 'bg-moss-50 text-moss-700' : 'bg-red-50 text-red-600'"
      >
        <component :is="delta >= 0 ? PhArrowUp : PhArrowDown" :size="11" weight="bold" />
        {{ Math.abs(delta) }}%
      </span>
    </div>
    <p v-if="sub" class="mt-1.5 truncate text-xs text-neutral-400">{{ sub }}</p>
  </div>
</template>
