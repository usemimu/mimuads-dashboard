<script setup lang="ts">
/**
 * Objective option card (X pattern): a selectable tile that, when active,
 * expands to show "How it works" + "Good for" detail. Content is passed in so
 * the parent owns the i18n.
 */
defineProps<{
  title: string
  hint: string
  howItWorks: string
  goodFor: string
  selected: boolean
  howItWorksLabel: string
  goodForLabel: string
}>()
</script>

<template>
  <button
    type="button"
    class="w-full rounded-xl border p-4 text-left transition-colors"
    :class="selected ? 'border-clay-500 bg-clay-50/60 ring-1 ring-clay-500/40' : 'border-line-strong hover:bg-neutral-50'"
  >
    <div class="flex items-start gap-3">
      <span
        class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
        :class="selected ? 'border-clay-500' : 'border-neutral-300'"
      >
        <span v-if="selected" class="h-2 w-2 rounded-full bg-clay-500" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-display text-[15px] font-semibold text-neutral-900">{{ title }}</p>
        <p class="mt-0.5 text-sm text-neutral-500">{{ hint }}</p>

        <div v-if="selected" class="mt-3 space-y-2 border-t border-line pt-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ howItWorksLabel }}</p>
            <p class="mt-0.5 text-[13px] text-neutral-600">{{ howItWorks }}</p>
          </div>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ goodForLabel }}</p>
            <p class="mt-0.5 text-[13px] text-neutral-600">{{ goodFor }}</p>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>
