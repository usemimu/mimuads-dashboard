<script setup lang="ts">
/**
 * Creative preview — the same native approach the admin console uses to review
 * ads (no player library): an HTML5 `<video controls>` for video and `<img>`
 * for image, fed a signed `src` (previewUrl / cdnUrl). `preload="metadata"`
 * so opening the step doesn't pull the whole file before play.
 */
defineProps<{
  format: 'video' | 'image'
  src: string | null | undefined
  poster?: string | null
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-black">
    <video
      v-if="format === 'video' && src"
      :key="src"
      :src="src"
      :poster="poster || undefined"
      controls
      preload="metadata"
      playsinline
      class="block max-h-[50vh] w-full bg-black"
    >
      Your browser doesn't support inline video playback.
    </video>
    <img
      v-else-if="format === 'image' && src"
      :src="src"
      alt="creative preview"
      class="mx-auto block max-h-[50vh] w-full bg-black object-contain"
    />
    <div v-else class="flex aspect-video items-center justify-center text-sm text-neutral-400">
      Preview unavailable — it may still be processing.
    </div>
  </div>
</template>
