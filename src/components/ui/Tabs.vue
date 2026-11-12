<script setup lang="ts" generic="T extends string">
/**
 * Reusable tabs (Tailwind Plus "Tabs" pattern, clay-themed). Underline tabs on
 * sm+, a native <select> on mobile. v-model the active tab value. Optional per-
 * tab count badge. No Headless UI needed.
 */
defineProps<{
  modelValue: T
  tabs: ReadonlyArray<{ value: T; label: string; count?: number | string }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: T): void }>()
</script>

<template>
  <div>
    <!-- Mobile: select -->
    <div class="sm:hidden">
      <select
        class="select w-full"
        :value="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as T)"
      >
        <option v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</option>
      </select>
    </div>

    <!-- Desktop: underline tabs -->
    <div class="hidden sm:block">
      <div class="border-b border-line">
        <nav class="-mb-px flex gap-6" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="flex whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors"
            :class="
              modelValue === tab.value
                ? 'border-clay-500 text-clay-700'
                : 'border-transparent text-neutral-500 hover:border-line-strong hover:text-neutral-700'
            "
            :aria-current="modelValue === tab.value ? 'page' : undefined"
            @click="emit('update:modelValue', tab.value)"
          >
            {{ tab.label }}
            <span
              v-if="tab.count != null"
              class="ml-2 hidden rounded-full px-2 py-0.5 text-xs font-medium md:inline-block"
              :class="modelValue === tab.value ? 'bg-clay-500/10 text-clay-700' : 'bg-surface-sunken text-neutral-600'"
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>
