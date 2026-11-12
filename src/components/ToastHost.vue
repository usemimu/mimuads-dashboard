<script setup lang="ts">
import { PhCheckCircle, PhXCircle, PhWarning, PhInfo, PhX } from '@phosphor-icons/vue'
import { useToastStore, type ToastKind } from '@/stores/toast'

const toast = useToastStore()

const icon = { success: PhCheckCircle, error: PhXCircle, warning: PhWarning, info: PhInfo }
const tone: Record<ToastKind, string> = {
  success: 'border-moss-200 bg-moss-50 text-moss-800',
  error: 'border-clay-200 bg-clay-50 text-clay-800',
  warning: 'border-gold-200 bg-gold-50 text-gold-800',
  info: 'border-line bg-surface text-neutral-800',
}
const iconTone: Record<ToastKind, string> = {
  success: 'text-moss-500',
  error: 'text-clay-500',
  warning: 'text-gold-500',
  info: 'text-neutral-400',
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="-translate-y-1 opacity-0"
    >
      <div
        v-for="t in toast.items"
        :key="t.id"
        role="alert"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-pop"
        :class="tone[t.kind]"
      >
        <component :is="icon[t.kind]" :size="18" weight="fill" class="mt-0.5 shrink-0" :class="iconTone[t.kind]" />
        <span class="flex-1 leading-snug">{{ t.message }}</span>
        <button class="shrink-0 text-neutral-400 hover:text-neutral-700" @click="toast.dismiss(t.id)">
          <PhX :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
