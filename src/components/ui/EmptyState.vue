<script setup lang="ts">
import MimuIcon from './MimuIcon.vue'

/**
 * Centered empty/zero state: optional icon, title, message, and an
 * actions slot for a primary CTA. Used inside a Card or a page section.
 */
withDefaults(
  defineProps<{
    title: string
    message?: string
    /** Mimuads neo-brutalist sticker name; shown large in place of the icon slot. */
    sticker?: string
  }>(),
  {},
)
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <MimuIcon v-if="sticker" :name="sticker" variant="sticker" :size="152" class="mb-4" />
    <div
      v-else-if="$slots.icon"
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-neutral-400"
    >
      <slot name="icon" />
    </div>
    <p class="font-body text-xl font-semibold text-neutral-900">{{ title }}</p>
    <p v-if="message" class="mt-1 max-w-sm text-sm text-neutral-500">{{ message }}</p>
    <div v-if="$slots.actions" class="mt-5 flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
