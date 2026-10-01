<script setup lang="ts">
/** Centered single-column shell for auth/onboarding screens (PRD §4.1). */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Steps from '@/components/ui/Steps.vue'

const props = withDefaults(
  defineProps<{
    // Onboarding progress, in flow order: Account → Verify → Organization.
    step?: 0 | 1 | 2 | null
  }>(),
  { step: null },
)
const { t } = useI18n()
const stepLabels = computed(() =>
  (['steps.account', 'steps.verify', 'steps.organization'] as const).map((k) => t(k)),
)
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 py-10"
  >
    <!-- Soft brand wash so the auth screens don't read as a bare form. -->
    <div
      class="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--auth-wash)] blur-3xl"
    />
    <div class="relative w-full max-w-md animate-fade-in">
      <div class="mb-6 flex flex-col items-center gap-2.5 text-center">
        <img src="/bimi-logo.svg" alt="" class="h-11 w-11 rounded-xl shadow-card" />
        <h1 class="font-display text-2xl font-bold tracking-tight text-neutral-900">{{ $t('app.name') }}</h1>
      </div>

      <div v-if="step !== null" class="mb-6">
        <Steps :steps="stepLabels" :current="step ?? 0" />
      </div>

      <div class="rounded-2xl border border-line bg-surface p-8 shadow-float">
        <slot />
      </div>

      <p class="mt-4 text-center text-sm text-neutral-500">
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>
