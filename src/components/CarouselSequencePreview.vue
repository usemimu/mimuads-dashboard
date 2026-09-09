<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

/** One frame the preview cycles through. */
interface Frame {
  previewUrl?: string
  format: 'image' | 'video'
  dwellSeconds: number
}

const props = defineProps<{ items: Frame[] }>()

const index = ref(0)
let timer: ReturnType<typeof setTimeout> | null = null

function schedule() {
  if (timer) clearTimeout(timer)
  if (props.items.length === 0) return
  const dwellMs = (props.items[index.value]?.dwellSeconds ?? 5) * 1000
  timer = setTimeout(() => {
    index.value = (index.value + 1) % props.items.length
    schedule()
  }, dwellMs)
}

// Restart the loop whenever the frame set changes (added/removed/reordered/dwell).
watch(
  () => props.items.map((f) => `${f.previewUrl}:${f.dwellSeconds}`).join('|'),
  () => {
    index.value = 0
    schedule()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg bg-black"
    style="aspect-ratio: 16 / 9;"
  >
    <template v-for="(f, i) in items" :key="i">
      <video
        v-if="f.format === 'video' && f.previewUrl"
        v-show="i === index"
        :src="f.previewUrl"
        muted
        autoplay
        loop
        playsinline
        class="absolute inset-0 h-full w-full object-contain"
      />
      <img
        v-else-if="f.previewUrl"
        v-show="i === index"
        :src="f.previewUrl"
        alt=""
        class="absolute inset-0 h-full w-full object-contain"
      />
    </template>

    <!-- progress dots -->
    <div class="absolute inset-x-0 bottom-2 flex justify-center gap-1">
      <span
        v-for="(f, i) in items"
        :key="i"
        class="h-1 rounded-full transition-all"
        :style="{
          width: i === index ? '20px' : '10px',
          background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
        }"
      />
    </div>
  </div>
</template>
