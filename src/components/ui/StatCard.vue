<script setup lang="ts">
import Card from './Card.vue'

/**
 * KPI tile: an eyebrow label, a large editorial value set in the display
 * Aeonik (tabular figures — the "marketing platform" hero
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
  <Card class="flex flex-col gap-2 [container-type:inline-size]">
    <div class="flex items-start justify-between">
      <p class="eyebrow pt-0.5">{{ label }}</p>
      <span
        v-if="$slots.icon"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-500"
      >
        <slot name="icon" />
      </span>
    </div>
    <!-- The value scales with the tile width (cqi) so long amounts like
         ₦500,000,000 never overflow the box, while capping at the hero size
         on wide tiles. `whitespace-nowrap` keeps it on one line. -->
    <p
      class="whitespace-nowrap font-semibold leading-none text-neutral-900 [font-variant-numeric:tabular-nums]"
      :class="mono ? 'font-mono text-[clamp(1rem,7cqi,1.5rem)]' : 'font-display text-[clamp(1.125rem,9cqi,2.5rem)]'"
    >
      {{ value }}
    </p>
    <div v-if="$slots.footer" class="text-xs"><slot name="footer" /></div>
  </Card>
</template>
