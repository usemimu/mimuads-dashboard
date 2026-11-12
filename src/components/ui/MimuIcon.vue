<script setup lang="ts">
import { computed } from 'vue'

/**
 * Mimuads neo-brutalist sticker icon (flat fill, ink outline, hard shadow) for metric
 * tiles, empty states and feature cards. Files live in src/assets/icons/brutal/<name>.svg;
 * only the stickers in use are kept — copy more from the Mimuads brand kit when needed.
 * `variant` is kept for call-site clarity; only "sticker" is available.
 */
const stickers = import.meta.glob('@/assets/icons/brutal/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.svg', ''), url]))
const STICKERS = byName(stickers)

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    variant?: 'sticker'
    label?: string
  }>(),
  { size: 64, variant: 'sticker' },
)

const url = computed(() => STICKERS[props.name])
</script>

<template>
  <img
    :src="url"
    :width="size"
    :height="size"
    :alt="label ?? ''"
    :aria-hidden="label ? undefined : 'true'"
    class="shrink-0 select-none"
    draggable="false"
  />
</template>
