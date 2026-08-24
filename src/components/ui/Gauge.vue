<script setup lang="ts">
import { computed } from 'vue'

/**
 * Narrow↔Broad targeting meter (X's audience-breadth gauge). `value` is 0..1;
 * segments fill left→right in clay. Purely presentational.
 */
const props = withDefaults(
  defineProps<{
    value: number
    segments?: number
    lowLabel?: string
    highLabel?: string
  }>(),
  { segments: 7, lowLabel: 'Narrow', highLabel: 'Broad' },
)

const filled = computed(() => {
  const v = Math.max(0, Math.min(1, props.value || 0))
  return Math.round(v * props.segments)
})
</script>

<template>
  <div>
    <div class="flex items-center gap-1">
      <span
        v-for="i in segments"
        :key="i"
        class="h-2 flex-1 rounded-full transition-colors"
        :class="i <= filled ? 'bg-clay-500' : 'bg-neutral-200'"
      />
    </div>
    <div class="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-neutral-400">
      <span>{{ lowLabel }}</span>
      <span>{{ highLabel }}</span>
    </div>
  </div>
</template>
