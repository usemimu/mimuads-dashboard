<script setup lang="ts">
import { computed } from 'vue'

/**
 * Dependency-free area/line chart (X's dashboard trend). Renders `points` as a
 * clay area with a crisp non-scaling stroke; stretches to fill width via a
 * `preserveAspectRatio="none"` viewBox while keeping the line 1px. Shows an
 * X-style empty state when there's no data. Axis labels are HTML (not SVG) so
 * they don't distort with the stretch.
 */
const props = withDefaults(
  defineProps<{
    points: number[]
    labels: string[]
    empty?: string
    height?: number
  }>(),
  { empty: 'No data for this period', height: 200 },
)

const W = 100 // viewBox width; H below
const H = 100

const max = computed(() => Math.max(1, ...props.points))
const hasData = computed(() => props.points.length > 0 && props.points.some((p) => p > 0))

const coords = computed(() =>
  props.points.map((v, i) => {
    const x = props.points.length === 1 ? W / 2 : (i / (props.points.length - 1)) * W
    const y = H - 6 - (v / max.value) * (H - 12) // 6px top/bottom padding
    return { x, y }
  }),
)

const linePath = computed(() =>
  coords.value.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' '),
)
const areaPath = computed(() => {
  if (!coords.value.length) return ''
  const first = coords.value[0]!
  const last = coords.value[coords.value.length - 1]!
  return `${linePath.value} L${last.x.toFixed(2)},${H} L${first.x.toFixed(2)},${H} Z`
})

// Show first / middle / last axis labels only (avoid crowding).
const axisLabels = computed(() => {
  const n = props.labels.length
  if (!n) return []
  if (n <= 3) return props.labels
  return [props.labels[0]!, props.labels[Math.floor(n / 2)]!, props.labels[n - 1]!]
})
</script>

<template>
  <div>
    <div v-if="hasData" :style="{ height: height + 'px' }" class="w-full">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="h-full w-full">
        <defs>
          <linearGradient id="ts-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#B55430" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#B55430" stop-opacity="0" />
          </linearGradient>
        </defs>
        <!-- baseline gridline -->
        <line x1="0" :y1="H - 6" :x2="W" :y2="H - 6" stroke="#E6E1D9" stroke-width="0.5" vector-effect="non-scaling-stroke" />
        <path :d="areaPath" fill="url(#ts-fill)" />
        <path
          :d="linePath"
          fill="none"
          stroke="#B55430"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <div v-if="axisLabels.length" class="mt-2 flex justify-between text-[11px] text-neutral-400">
        <span v-for="(l, i) in axisLabels" :key="i">{{ l }}</span>
      </div>
    </div>

    <div
      v-else
      :style="{ height: height + 'px' }"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-line text-sm text-neutral-400"
    >
      <p>{{ empty }}</p>
    </div>
  </div>
</template>
