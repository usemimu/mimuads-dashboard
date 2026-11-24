<script setup lang="ts">
import { ref, watch } from 'vue'
import { getCarousel } from '@/api/carousel'

const props = defineProps<{
  format: 'video' | 'image' | 'carousel'
  src: string | null | undefined
  poster?: string | null
  /** Required when format === 'carousel' */
  carouselId?: string | null
}>()

type CarouselItem = {
  id: string
  sequence: number
  format: 'image' | 'video'
  dwellSeconds: number
  filename: string
  cdnUrl: string | null | undefined
}

const carouselItems = ref<CarouselItem[]>([])
const carouselLoading = ref(false)

watch(
  () => [props.format, props.carouselId] as const,
  async ([fmt, cid]) => {
    if (fmt !== 'carousel' || !cid) return
    carouselLoading.value = true
    try {
      const res = await getCarousel(cid)
      carouselItems.value = [...(res.items ?? [])].sort((a, b) => a.sequence - b.sequence)
    } catch {
      carouselItems.value = []
    } finally {
      carouselLoading.value = false
    }
  },
  { immediate: true },
)

const totalSeconds = () => carouselItems.value.reduce((s, i) => s + i.dwellSeconds, 0)
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-black">
    <!-- Video -->
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

    <!-- Image -->
    <img
      v-else-if="format === 'image' && src"
      :src="src"
      alt="creative preview"
      class="mx-auto block max-h-[50vh] w-full bg-black object-contain"
    />

    <!-- Carousel -->
    <div v-else-if="format === 'carousel'" class="bg-neutral-950 p-3">
      <div v-if="carouselLoading" class="flex aspect-video items-center justify-center text-sm text-neutral-400">
        Loading frames…
      </div>
      <div v-else-if="carouselItems.length === 0" class="flex aspect-video items-center justify-center text-sm text-neutral-400">
        No frames yet — it may still be processing.
      </div>
      <div v-else class="space-y-2">
        <!-- Frame strip -->
        <div class="flex gap-2 overflow-x-auto pb-1">
          <div
            v-for="(item, i) in carouselItems"
            :key="item.id"
            class="relative shrink-0 w-36 rounded overflow-hidden border border-neutral-700"
          >
            <!-- Image frame -->
            <img
              v-if="item.format === 'image' && item.cdnUrl"
              :src="item.cdnUrl"
              :alt="`Frame ${i + 1}`"
              class="w-full aspect-video object-cover"
            />
            <!-- Video frame placeholder -->
            <div
              v-else
              class="w-full aspect-video bg-neutral-800 flex items-center justify-center"
            >
              <svg class="w-7 h-7 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <!-- Dwell badge -->
            <span class="absolute bottom-1 right-1 text-[10px] font-medium bg-black/70 text-white rounded px-1 py-px">
              {{ item.dwellSeconds }}s
            </span>
            <!-- Sequence badge -->
            <span class="absolute top-1 left-1 text-[10px] font-bold bg-black/70 text-white rounded px-1 py-px">
              {{ i + 1 }}
            </span>
          </div>
        </div>
        <!-- Summary line -->
        <p class="text-right text-xs text-neutral-500">
          {{ carouselItems.length }} frames · {{ totalSeconds() }}s total
        </p>
      </div>
    </div>

    <!-- Fallback -->
    <div v-else class="flex aspect-video items-center justify-center text-sm text-neutral-400">
      Preview unavailable — it may still be processing.
    </div>
  </div>
</template>
