<script setup lang="ts">
/** Centered single-column shell for auth/onboarding screens (PRD §4.1). */
withDefaults(
  defineProps<{
    step?: 0 | 1 | 2 | null // Account / Organization / Verify progress
  }>(),
  { step: null },
)
const steps = ['steps.account', 'steps.organization', 'steps.verify'] as const
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 py-10"
  >
    <!-- Soft brand wash so the auth screens don't read as a bare form. -->
    <div
      class="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-clay-100/50 blur-3xl"
    />
    <div class="relative w-full max-w-md animate-fade-in">
      <div class="mb-6 text-center">
        <h1 class="font-display text-4xl font-semibold text-clay-600">{{ $t('app.name') }}</h1>
      </div>

      <ol v-if="step !== null" class="mb-6 flex items-center justify-center gap-2">
        <li v-for="(s, i) in steps" :key="s" class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors"
            :class="
              i <= (step ?? 0)
                ? 'bg-clay-500 text-white'
                : 'bg-neutral-200 text-neutral-500'
            "
            >{{ i + 1 }}</span
          >
          <span
            class="text-xs"
            :class="i <= (step ?? 0) ? 'text-neutral-900' : 'text-neutral-400'"
            >{{ $t(s) }}</span
          >
          <span v-if="i < steps.length - 1" class="mx-1 h-px w-4 bg-neutral-300" />
        </li>
      </ol>

      <div class="rounded-xl border border-line bg-surface p-8 shadow-card-hover">
        <slot />
      </div>

      <p class="mt-4 text-center text-sm text-neutral-500">
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>
