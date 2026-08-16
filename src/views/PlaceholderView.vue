<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { PhWrench } from '@phosphor-icons/vue'

/** Generic slice-1 placeholder for shell routes built out in later slices. */
const route = useRoute()
const titleKey = computed(() => (route.meta.titleKey as string) ?? 'app.name')
</script>

<template>
  <div>
    <h1 class="mb-8 font-display text-3xl font-semibold leading-none text-neutral-900 sm:text-4xl">
      {{ $t(titleKey) }}
    </h1>
    <div
      class="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/50"
    >
      <PhWrench :size="28" class="text-neutral-300" />
      <span class="text-sm font-medium text-neutral-400">{{ $t('common.comingSoon') }}</span>
    </div>
  </div>
</template>
