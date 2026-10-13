<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'

// Probe the real env(safe-area-inset-*) values after mount.
// Safari returns the physical notch/home-indicator sizes; Chrome returns 0.
// For touch devices where env() gave nothing, fall back to standard bar heights
// so the strips remain visible in Chrome too.
const safeTop = ref('env(safe-area-inset-top, 0px)')
const safeBottom = ref('env(safe-area-inset-bottom, 0px)')

onMounted(() => {
  const probe = document.createElement('div')
  Object.assign(probe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: 'env(safe-area-inset-top, 0px)',
    pointerEvents: 'none',
    visibility: 'hidden',
  })
  document.documentElement.appendChild(probe)
  const envTop = probe.getBoundingClientRect().height
  document.documentElement.removeChild(probe)

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  if (envTop === 0 && isTouch) {
    safeTop.value = '24px'
    safeBottom.value = '20px'
  }
})
</script>

<template>
  <!-- Safe-area color fills — clay base + Tall Poppy pattern, matching the
       mimu-web hero and the AuthCard brand panel. Chrome Android relies on the
       theme-color meta (already #AE4828); Safari uses these fixed strips. -->
  <div class="safe-fill fixed top-0 inset-x-0 z-[200]" :style="{ height: safeTop }" />
  <div class="safe-fill fixed bottom-0 inset-x-0 z-[200]" :style="{ height: safeBottom }" />

  <RouterView />
  <ToastHost />
</template>

<style scoped>
/* Same values as .auth-pattern (AuthCard.vue) / the mimu-web hero: clay base
   with a Tall Poppy pattern tile multiplied over it. */
.safe-fill {
  background: #ae4828;
  overflow: hidden;
}
.safe-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
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
</style>
