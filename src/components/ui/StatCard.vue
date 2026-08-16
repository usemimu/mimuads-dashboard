<script setup lang="ts">
import Card from './Card.vue'

/**
 * KPI tile: small uppercase label, large value (mono by default for
 * money/metrics), optional icon and a footer slot for a link or trend.
 */
withDefaults(
  defineProps<{
    label: string
    value: string | number
    /** Mono + tabular figures — right for money and counts. */
    mono?: boolean
  }>(),
  { mono: true },
)
</script>

<template>
  <Card class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {{ label }}
      </p>
      <span v-if="$slots.icon" class="text-neutral-300"><slot name="icon" /></span>
    </div>
    <p
      class="mt-1 font-semibold text-neutral-900"
      :class="mono ? 'font-mono text-2xl' : 'text-xl capitalize'"
    >
      {{ value }}
    </p>
    <div v-if="$slots.footer" class="mt-1 text-xs"><slot name="footer" /></div>
  </Card>
</template>
