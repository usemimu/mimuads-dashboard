<script setup lang="ts">
/** Split auth/onboarding shell: form on the left, brand panel on the right. */
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
  <div class="flex min-h-screen bg-surface">
    <!-- Form side -->
    <div class="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2 xl:px-16">
      <div class="flex items-center">
        <a href="https://usemimu.com" target="_blank" rel="noopener noreferrer">
          <img src="/mimu-mark.svg" :alt="$t('app.name')" class="h-9 w-auto" />
        </a>
      </div>

      <div class="flex flex-1 items-center justify-center py-10">
        <div class="w-full max-w-sm animate-fade-in">
          <div v-if="step !== null" class="mb-6">
            <Steps :steps="stepLabels" :current="step ?? 0" />
          </div>
          <slot />
          <p class="mt-6 text-center text-sm text-neutral-500">
            <slot name="footer" />
          </p>
        </div>
      </div>
    </div>

    <!-- Brand panel: rust + Tall Poppy wave pattern (desktop only) -->
    <div class="relative hidden overflow-hidden bg-[#AE4828] lg:block lg:w-1/2">
      <div class="auth-pattern pointer-events-none absolute inset-0" aria-hidden="true" />

      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <img src="/auth/plane.png" class="auth-plane absolute left-1/2 top-[47%] w-[38%]" />
      </div>

      <div class="relative flex h-full flex-col justify-end p-14 text-white">
        <h2 class="font-body text-[2.1rem] font-semibold leading-[1.12] tracking-tight">
          The infrastructure layer for physical ad&nbsp;buying.
        </h2>
        <p class="mt-4 max-w-sm text-[15px] leading-relaxed text-white/75">
          Every DOOH screen, verified and programmatic.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Matches the mimu-web home hero: Tall Poppy waves (PNG mask over a colour
   fill, multiplied so the hue reads) on the rust panel. */
.auth-pattern {
  background-color: #bc3433; /* Tall Poppy */
  -webkit-mask-image: url('/auth-pattern.png');
  mask-image: url('/auth-pattern.png');
  -webkit-mask-size: 520px;
  mask-size: 520px;
  -webkit-mask-repeat: repeat;
  mask-repeat: repeat;
  mix-blend-mode: multiply;
  opacity: 0.7;
}

/* Lift the paper plane off the rust so its clay tones read. */
.auth-plane {
  filter: drop-shadow(0 16px 26px rgba(42, 14, 5, 0.38));
  transform: translate(-50%, -50%);
  animation: plane-float 6.5s ease-in-out infinite;
}
@keyframes plane-float {
  0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
  50% { transform: translate(-50%, -54%) rotate(-2.5deg); }
}
@media (prefers-reduced-motion: reduce) {
  .auth-plane { animation: none; }
}
</style>
