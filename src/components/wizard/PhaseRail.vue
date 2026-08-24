<script setup lang="ts">
import { PhCheck } from '@phosphor-icons/vue'

/**
 * Left rail for the campaign wizard — X's phase list (Pick objective → Define
 * audience → Craft your ad → Launch) with done / active / upcoming states and a
 * connecting spine. Clicking a reachable phase navigates back to it.
 */
defineProps<{
  phases: { key: string; label: string }[]
  active: number
  /** Highest phase index the user has completed enough to reach. */
  maxReached: number
}>()
const emit = defineEmits<{ (e: 'go', index: number): void }>()
</script>

<template>
  <nav class="flex flex-col gap-1">
    <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
      {{ $t('wizard.stepsLabel') }}
    </p>
    <button
      v-for="(p, i) in phases"
      :key="p.key"
      type="button"
      class="group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
      :class="[
        i === active ? 'bg-clay-500/[0.08]' : 'hover:bg-neutral-900/[0.035]',
        i <= maxReached ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
      ]"
      :disabled="i > maxReached"
      @click="i <= maxReached && emit('go', i)"
    >
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors"
        :class="
          i < active
            ? 'border-clay-500 bg-clay-500 text-white'
            : i === active
              ? 'border-clay-500 text-clay-600'
              : 'border-line-strong text-neutral-400'
        "
      >
        <PhCheck v-if="i < active" :size="13" weight="bold" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span
        class="text-[13px] font-medium"
        :class="i === active ? 'text-neutral-900' : i < active ? 'text-neutral-700' : 'text-neutral-400'"
      >
        {{ p.label }}
      </span>
    </button>

    <p class="mt-3 px-2.5 text-[11px] text-neutral-400">{{ $t('wizard.timeHint') }}</p>
  </nav>
</template>
