<script setup lang="ts">
/**
 * Onboarding-pending: an authenticated user with no org yet. The full 3-page
 * signup/org-fork flow lands in slice 2; slice 1 gates the shell behind org
 * existence and shows this state.
 */
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
    <div class="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <h1 class="font-display text-3xl font-semibold text-neutral-900">
        {{ $t('onboarding.pendingTitle') }}
      </h1>
      <p class="mt-2 text-sm text-neutral-500">{{ $t('onboarding.pendingBody') }}</p>
    </div>
  </div>
</template>
