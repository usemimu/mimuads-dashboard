<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'

/**
 * Core container — an "editorial console" surface: white on the sand
 * background, a warm hairline border and only a whisper of shadow.
 * Set `interactive` for clickable cards that lift on hover.
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
  md: 'p-5',
  lg: 'p-7',
}

const classes = computed(() =>
  cn(
    'rounded-xl border border-line bg-surface shadow-card',
    pad[props.padding],
    props.interactive &&
      'cursor-pointer transition-all duration-200 hover:border-line-strong hover:shadow-card-hover',
    props.class,
  ),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
