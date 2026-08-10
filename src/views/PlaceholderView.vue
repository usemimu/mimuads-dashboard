<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

/** Generic slice-1 placeholder for shell routes built out in later slices. */
const route = useRoute()
const titleKey = computed(() => (route.meta.titleKey as string) ?? 'app.name')
</script>

<template>
  <div>
    <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ $t(titleKey) }}</h1>
    <div
      class="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white"
    >
      <span class="text-sm text-neutral-400">{{ $t('common.comingSoon') }}</span>
    </div>
  </div>
</template>
