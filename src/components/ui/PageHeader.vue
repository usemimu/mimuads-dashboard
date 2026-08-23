<script setup lang="ts">
/**
 * Standard page header — full-bleed top bar with a hairline underline that
 * spans the page, mirroring the admin console's `.page-header`. Display
 * title + optional subtitle on the left, actions slot on the right.
 * Pair with a `.page-body` wrapper for the page content below it.
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
  <div class="page-header -mx-6 -mt-5 mb-5">
    <div class="page-title-row">
      <div class="min-w-0">
        <div class="page-title truncate">{{ title }}</div>
        <p v-if="subtitle" class="page-subtitle mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="flex-1" />
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
