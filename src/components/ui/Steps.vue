<script setup lang="ts">
/**
 * Horizontal progress steps (Tailwind Plus "Steps", clay-themed). Done steps
 * show a check on a filled clay dot, the current step is a clay ring, upcoming
 * are muted — with connecting lines that fill as you advance. `current` is
 * 0-based.
 */
import { PhCheck } from '@phosphor-icons/vue'

defineProps<{
  steps: ReadonlyArray<string>
  current: number
}>()
</script>

<template>
  <nav aria-label="Progress">
    <ol role="list" class="flex items-center">
      <li
        v-for="(s, i) in steps"
        :key="i"
        class="flex items-center"
        :class="i < steps.length - 1 ? 'flex-1' : ''"
      >
        <div class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors"
            :class="
              i < current
                ? 'bg-clay-500 text-white'
                : i === current
                  ? 'border-2 border-clay-500 bg-clay-500/10 text-clay-700'
                  : 'border-2 border-line text-neutral-400'
            "
          >
            <PhCheck v-if="i < current" :size="14" weight="bold" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span
            class="hidden whitespace-nowrap text-xs font-medium sm:inline"
            :class="i <= current ? 'text-neutral-900' : 'text-neutral-400'"
          >
            {{ s }}
          </span>
        </div>
        <span
          v-if="i < steps.length - 1"
          class="mx-3 h-0.5 flex-1 rounded-full transition-colors"
          :class="i < current ? 'bg-clay-500' : 'bg-line'"
        />
      </li>
    </ol>
  </nav>
</template>
