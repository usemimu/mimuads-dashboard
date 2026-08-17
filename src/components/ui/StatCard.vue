<script setup lang="ts">
import Card from './Card.vue'

/**
 * KPI tile: an eyebrow label, a large editorial value set in the display
 * serif (Cormorant, tabular figures — the "marketing platform" hero
 * number), an accented icon chip, and a footer slot for a link or trend.
 */
withDefaults(
  defineProps<{
    label: string
    value: string | number
    /** Use the mono face instead of the display serif for the value. */
    mono?: boolean
  }>(),
  { mono: false },
)
</script>

<template>
  <Card class="flex flex-col gap-2">
    <div class="flex items-start justify-between">
      <p class="eyebrow pt-0.5">{{ label }}</p>
      <span
        v-if="$slots.icon"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-500"
      >
        <slot name="icon" />
      </span>
    </div>
    <p
      class="font-semibold leading-none text-neutral-900 [font-variant-numeric:tabular-nums]"
      :class="mono ? 'font-mono text-2xl' : 'font-display text-[2.5rem]'"
    >
      {{ value }}
    </p>
    <div v-if="$slots.footer" class="text-xs"><slot name="footer" /></div>
  </Card>
</template>
