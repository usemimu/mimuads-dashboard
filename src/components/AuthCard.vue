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
        <img src="/mimu-mark.svg" :alt="$t('app.name')" class="h-9 w-auto" />
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

      <!-- Flight scene: paper plane centered, white clouds clustered around it,
           arrow swooshes as wave streaks across the top -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <!-- white wave streaks across the top -->
        <img src="/auth/arrow8.svg" class="wave absolute right-[-4%] top-[7%] w-[40%]" style="opacity: 0.9; animation-delay: -1s" />
        <img src="/auth/arrow8.svg" class="wave-flip absolute left-[-5%] top-[9%] w-[40%]" style="opacity: 0.85; animation-delay: -3s" />
        <img src="/auth/arrow7.svg" class="wave absolute left-[30%] top-[2%] w-[40%]" style="opacity: 0.9; animation-delay: -2s" />

        <!-- white clouds clustered above / around the plane -->
        <img src="/auth/cloud5.png" class="cloud-c absolute left-1/2 top-[28%] w-[32%]" style="animation-delay: -1s" />
        <img src="/auth/cloud4.png" class="cloud absolute left-[12%] top-[32%] w-[22%]" style="animation-delay: -5s" />
        <img src="/auth/cloud3.png" class="cloud absolute right-[12%] top-[31%] w-[22%]" style="animation-delay: -3s" />
        <img src="/auth/cloud1.png" class="cloud absolute left-[24%] top-[40%] w-[26%]" style="animation-delay: -2s" />
        <img src="/auth/cloud2.png" class="cloud absolute right-[23%] top-[38%] w-[20%]" style="animation-delay: -4s" />

        <!-- plane on top of the cluster -->
        <img src="/auth/arrow1.svg" class="absolute left-[27%] top-[42%] w-[11%]" style="opacity: 0.5" />
        <img src="/auth/plane.png" class="auth-plane absolute left-1/2 top-[47%] w-[38%]" />
      </div>

      <div class="relative flex h-full flex-col justify-end p-14 text-white">
        <h2 class="font-display text-[2.1rem] font-semibold leading-[1.12] tracking-tight">
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
.cloud { animation: drift 11s ease-in-out infinite; }
.cloud-c { transform: translateX(-50%); animation: drift-c 12s ease-in-out infinite; }
.wave { animation: drift 9s ease-in-out infinite; }
.wave-flip { transform: scaleX(-1); animation: drift-flip 10s ease-in-out infinite; }

@keyframes plane-float {
  0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
  50% { transform: translate(-50%, -54%) rotate(-2.5deg); }
}
@keyframes drift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes drift-c {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-8px); }
}
@keyframes drift-flip {
  0%, 100% { transform: scaleX(-1) translateY(0); }
  50% { transform: scaleX(-1) translateY(-8px); }
}
@media (prefers-reduced-motion: reduce) {
  .auth-plane,
  .cloud,
  .cloud-c,
  .wave,
  .wave-flip {
    animation: none;
  }
}
</style>
