<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/**
 * Status pill. Tones mirror the mobile app's pill vocabulary:
 *   live/success → moss, pending → gold, danger → clay-red,
 *   accent → clay, neutral/draft → grey, info → blue-ish neutral.
 */
const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full font-body font-semibold uppercase tracking-wide',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-100 text-neutral-600',
        accent: 'bg-clay-50 text-clay-700',
        success: 'bg-moss-50 text-moss-700',
        pending: 'bg-gold-50 text-gold-700',
        danger: 'bg-clay-100 text-clay-800',
        info: 'bg-neutral-100 text-neutral-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-[11px]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

type BadgeProps = VariantProps<typeof badge>

const props = withDefaults(
  defineProps<{
    tone?: BadgeProps['tone']
    size?: BadgeProps['size']
    /** Show a leading status dot in the current text color. */
    dot?: boolean
    class?: string
  }>(),
  { dot: false },
)

const classes = computed(() => cn(badge({ tone: props.tone, size: props.size }), props.class))
</script>

<template>
  <span :class="classes">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot />
  </span>
</template>
