<script setup lang="ts">
import { PhCheckCircle, PhWarningCircle } from '@phosphor-icons/vue'
import type { HealthSuggestion } from '@/lib/campaignHealth'

/**
 * Right-rail Campaign-health panel — X's "Healthy / Needs attention" list. Each
 * suggestion's copy is translated by id (`wizard.health.<id>.title|body`); the
 * impact drives the chip tone.
 */
defineProps<{ suggestions: HealthSuggestion[] }>()

const impactClass: Record<string, string> = {
  high: 'bg-clay-500/10 text-clay-600 border-clay-500/25',
  medium: 'bg-gold-500/10 text-gold-600 border-gold-500/25',
  info: 'bg-surface-sunken text-neutral-600 border-line',
}
</script>

<template>
  <div class="rounded-xl border border-line bg-surface p-4 shadow-card">
    <div class="mb-3 flex items-center gap-2">
      <PhCheckCircle v-if="!suggestions.length" :size="18" weight="fill" class="text-moss-500" />
      <PhWarningCircle v-else :size="18" weight="fill" class="text-gold-500" />
      <p class="text-[13px] font-semibold text-neutral-900">{{ $t('wizard.health.title') }}</p>
      <span v-if="suggestions.length" class="ml-auto text-[11px] text-neutral-400">
        {{ $t('wizard.health.count', { n: suggestions.length }) }}
      </span>
    </div>

    <p v-if="!suggestions.length" class="text-sm text-neutral-500">{{ $t('wizard.health.healthy') }}</p>

    <ul v-else class="space-y-3">
      <li v-for="s in suggestions" :key="s.id" class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span
            class="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            :class="impactClass[s.impact]"
          >
            {{ $t('wizard.health.impact.' + s.impact) }}
          </span>
          <span class="text-[13px] font-semibold text-neutral-800">{{ $t('wizard.health.' + s.id + '.title') }}</span>
        </div>
        <p class="text-xs leading-relaxed text-neutral-500">{{ $t('wizard.health.' + s.id + '.body') }}</p>
      </li>
    </ul>
  </div>
</template>
