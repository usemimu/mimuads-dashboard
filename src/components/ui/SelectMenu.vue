<script setup lang="ts" generic="T extends string">
import { computed, ref } from 'vue'
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

const isOpen = ref(false)
const containerRef = ref<HTMLElement>()

const normalized = computed<Option[]>(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) })),
)
const selectedLabel = computed(
  () => normalized.value.find((o) => o.value === props.modelValue)?.label ?? '',
)

function toggle() {
  if (!props.disabled) isOpen.value = !isOpen.value
}

function select(value: T) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function handleFocusOut(e: FocusEvent) {
  if (!containerRef.value?.contains(e.relatedTarget as Node)) {
    isOpen.value = false
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative"
    @focusout="handleFocusOut"
    @keydown.escape="isOpen = false"
  >
    <button
      type="button"
      class="input flex w-full items-center justify-between gap-2 px-3 text-left disabled:cursor-not-allowed disabled:bg-neutral-100"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :disabled="disabled"
      @click.stop="toggle"
    >
      <span class="truncate" :class="selectedLabel ? 'text-neutral-900' : 'text-neutral-400'">
        {{ selectedLabel || placeholder || '—' }}
      </span>
      <PhCaretUpDown :size="16" class="shrink-0 text-neutral-400" />
    </button>
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <ul
        v-if="isOpen"
        role="listbox"
        class="absolute z-30 mt-1.5 max-h-60 w-full origin-top overflow-auto rounded-xl border border-line bg-surface py-1 shadow-pop focus:outline-none"
      >
        <li
          v-for="o in normalized"
          :key="o.value"
          role="option"
          :aria-selected="o.value === modelValue"
          class="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-clay-500/10 hover:text-neutral-900"
          @click="select(o.value)"
        >
          <span class="truncate" :class="o.value === modelValue ? 'font-semibold' : ''">{{ o.label }}</span>
          <PhCheck v-if="o.value === modelValue" :size="16" class="shrink-0 text-clay-600" />
        </li>
      </ul>
    </transition>
  </div>
</template>
