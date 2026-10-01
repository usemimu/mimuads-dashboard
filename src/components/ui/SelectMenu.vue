<script setup lang="ts" generic="T extends string">
/**
 * Styled dropdown (Tailwind Plus "Select menu", clay-themed) built on Headless
 * UI Listbox — replaces native <select> where we want a polished, consistent
 * control. Accepts plain string options or { value, label } objects. v-model the
 * value. Falls back to a placeholder when nothing is selected.
 */
import { computed } from 'vue'
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
import { PhCaretUpDown, PhCheck } from '@phosphor-icons/vue'

type Option = { value: T; label: string }
const props = defineProps<{
  modelValue: T
  options: ReadonlyArray<Option | T>
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: T): void }>()

const normalized = computed<Option[]>(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) })),
)
const selectedLabel = computed(
  () => normalized.value.find((o) => o.value === props.modelValue)?.label ?? '',
)
</script>

<template>
  <Listbox
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event as T)"
  >
    <div class="relative">
      <ListboxButton
        class="input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:bg-neutral-100"
        :aria-label="ariaLabel"
      >
        <span class="truncate" :class="selectedLabel ? 'text-neutral-900' : 'text-neutral-400'">
          {{ selectedLabel || placeholder || '—' }}
        </span>
        <PhCaretUpDown :size="16" class="shrink-0 text-neutral-400" />
      </ListboxButton>
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <ListboxOptions
          class="absolute z-30 mt-1.5 max-h-60 w-full origin-top overflow-auto rounded-xl border border-line bg-surface py-1 shadow-pop focus:outline-none"
        >
          <ListboxOption
            v-for="o in normalized"
            :key="o.value"
            v-slot="{ active, selected }"
            :value="o.value"
            as="template"
          >
            <li
              :class="[
                active ? 'bg-clay-500/10 text-neutral-900' : 'text-neutral-700',
                'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm',
              ]"
            >
              <span class="truncate" :class="selected ? 'font-semibold' : ''">{{ o.label }}</span>
              <PhCheck v-if="selected" :size="16" class="shrink-0 text-clay-600" />
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>
