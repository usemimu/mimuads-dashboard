<script setup lang="ts">
/**
 * Avatar — image when available, else clay initials chip. Deterministic initials
 * from a name/email. Sizes map to the common list/topbar footprints.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string | null
    email?: string | null
    src?: string | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const dims = computed(
  () =>
    ({
      sm: 'h-8 w-8 text-[11px]',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    })[props.size],
)

const initials = computed(() => {
  const base = (props.name || props.email || '').trim()
  if (!base) return 'M'
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase()
  return base.slice(0, 2).toUpperCase()
})
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="name ?? ''"
    class="shrink-0 rounded-full object-cover"
    :class="dims"
  />
  <div
    v-else
    class="flex shrink-0 items-center justify-center rounded-full bg-clay-500/15 font-semibold text-clay-700"
    :class="dims"
  >
    {{ initials }}
  </div>
</template>
