<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-body font-semibold ' +
    'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 ' +
    'focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-clay-500 text-white shadow-sm hover:bg-clay-600',
        secondary: 'border border-line-strong bg-surface text-neutral-800 hover:bg-neutral-50',
        outline: 'border border-line-strong bg-transparent text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50',
        ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
        danger: 'bg-clay-700 text-white shadow-sm hover:bg-clay-800',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-11 px-5 text-[15px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = VariantProps<typeof button>

const props = withDefaults(
  defineProps<{
    variant?: ButtonProps['variant']
    size?: ButtonProps['size']
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    class?: string
  }>(),
  { type: 'button', disabled: false },
)

const classes = computed(() =>
  cn(button({ variant: props.variant, size: props.size }), props.class),
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
