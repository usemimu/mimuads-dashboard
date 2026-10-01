<script setup lang="ts">
/**
 * Password input with a show/hide eye toggle (clay-themed). v-model the value;
 * passes through the common input attrs. The toggle is tabindex=-1 so it stays
 * out of the form's tab order.
 */
import { ref } from 'vue'
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'

defineProps<{
  modelValue: string
  autocomplete?: string
  placeholder?: string
  minlength?: number
  required?: boolean
  ariaLabel?: string
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const show = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :type="show ? 'text' : 'password'"
      :value="modelValue"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :minlength="minlength"
      :required="required"
      :aria-label="ariaLabel"
      class="input pr-10"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      tabindex="-1"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-neutral-400 transition-colors hover:text-neutral-700"
      :aria-label="show ? 'Hide password' : 'Show password'"
      @click="show = !show"
    >
      <PhEyeSlash v-if="show" :size="18" />
      <PhEye v-else :size="18" />
    </button>
  </div>
</template>
