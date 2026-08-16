<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'

/**
 * Floating-card surface — the console's core container. White on the
 * sand background, soft warm shadow, no hard border (see the design
 * system). Set `interactive` for clickable cards that lift on hover.
 */
const props = withDefaults(
  defineProps<{
    /** Padding preset. `none` when the card wraps its own edge-to-edge content (tables, media). */
    padding?: 'none' | 'sm' | 'md' | 'lg'
    /** Adds hover lift + pointer affordance for clickable cards. */
    interactive?: boolean
    class?: string
  }>(),
  { padding: 'md', interactive: false },
)

const pad = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const classes = computed(() =>
  cn(
    'rounded-2xl bg-white shadow-card',
    pad[props.padding],
    props.interactive &&
      'cursor-pointer transition-shadow duration-200 hover:shadow-card-hover',
    props.class,
  ),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
