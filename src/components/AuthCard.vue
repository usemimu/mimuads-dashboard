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
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
    <div class="w-full max-w-md">
      <div class="mb-6 text-center">
        <h1 class="font-display text-4xl font-semibold text-clay-600">{{ $t('app.name') }}</h1>
      </div>

      <ol v-if="step !== null" class="mb-6 flex items-center justify-center gap-2">
        <li v-for="(s, i) in steps" :key="s" class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
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

      <div class="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <slot />
      </div>

      <p class="mt-4 text-center text-sm text-neutral-500">
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>
