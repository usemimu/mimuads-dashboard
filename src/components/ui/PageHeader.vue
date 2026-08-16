<script setup lang="ts">
/**
 * Standard page header: serif display title + optional subtitle on the
 * left, actions slot on the right. Keeps every page's top edge aligned
 * and consistent.
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
  }>(),
  {},
)
</script>

<template>
  <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <h1 class="font-display text-3xl font-semibold leading-none text-neutral-900 sm:text-4xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-2 text-sm text-neutral-500">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
