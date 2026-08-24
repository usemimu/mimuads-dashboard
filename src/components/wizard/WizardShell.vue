<script setup lang="ts">
/**
 * Three-column wizard scaffold (X Ads Manager): a sticky left phase rail, the
 * scrolling step form in the middle, and a sticky right rail (estimate +
 * health). Collapses to a single column on small screens — rail on top,
 * aside below the form.
 */
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
    <!-- Phase rail -->
    <aside class="lg:sticky lg:top-4 lg:self-start">
      <slot name="rail" />
    </aside>

    <!-- Step form -->
    <div class="min-w-0">
      <slot />
    </div>

    <!-- Estimate + health -->
    <aside class="space-y-4 lg:sticky lg:top-4 lg:self-start">
      <slot name="aside" />
    </aside>
  </div>
</template>
