<script setup lang="ts">
/**
 * Compact KPI tile for the dashboard metrics row (X's Impressions / Spend / …
 * cells). Value auto-fits its width via container queries so long money values
 * never overflow. Optional sub-line for a delta / context.
 */
withDefaults(
  defineProps<{
    label: string
    value: string | number
    sub?: string
    active?: boolean
  }>(),
  { active: false },
)
</script>

<template>
  <div
    class="rounded-xl border bg-white p-4 shadow-card [container-type:inline-size]"
    :class="active ? 'border-clay-300 ring-1 ring-clay-500/20' : 'border-line'"
  >
    <p class="eyebrow">{{ label }}</p>
    <p
      class="mt-1.5 whitespace-nowrap font-display text-[clamp(1.125rem,9cqi,2rem)] font-semibold leading-none text-neutral-900 [font-variant-numeric:tabular-nums]"
    >
      {{ value }}
    </p>
    <p v-if="sub" class="mt-1 truncate text-xs text-neutral-400">{{ sub }}</p>
  </div>
</template>
