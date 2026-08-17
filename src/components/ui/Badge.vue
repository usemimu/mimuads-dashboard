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
  'inline-flex items-center gap-1.5 rounded-md border font-body font-semibold uppercase tracking-wide',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-neutral-50 text-neutral-600',
        accent: 'border-clay-200/70 bg-clay-50 text-clay-600',
        success: 'border-moss-200/70 bg-moss-50 text-moss-600',
        pending: 'border-gold-200/70 bg-gold-50 text-gold-600',
        danger: 'border-clay-200 bg-clay-50 text-clay-700',
        info: 'border-line bg-neutral-100 text-neutral-700',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2 py-0.5 text-[11px]',
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
