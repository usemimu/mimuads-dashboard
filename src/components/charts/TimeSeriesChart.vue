<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Standard responsive line/area chart (dependency-free). Pixel-accurate: an
 * internal ResizeObserver measures the container so 1 SVG unit = 1px — axes,
 * gridlines and labels stay crisp and aligned at any width. Renders a Y-axis
 * with value gridlines, a dated X-axis, a clay area + line, a dot on the latest
 * point, and a hover crosshair + tooltip. `labels[i]` pairs with `points[i]`;
 * callers should supply a continuous daily series ending today.
 */
const props = withDefaults(
  defineProps<{
    points: number[]
    labels: string[]
    empty?: string
    height?: number
    /** Optional unit suffix for the tooltip value (e.g. "plays"). */
    unit?: string
  }>(),
  { empty: 'No data for this period', height: 240, unit: '' },
)

// ── Responsive width ────────────────────────────────────────────────────
const wrap = ref<HTMLElement | null>(null)
const w = ref(640)
let ro: ResizeObserver | null = null
onMounted(() => {
  if (!wrap.value) return
  w.value = wrap.value.clientWidth || 640
  ro = new ResizeObserver((entries) => {
    const cr = entries[0]?.contentRect
    if (cr && cr.width > 0) w.value = cr.width
  })
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())

// ── Geometry ────────────────────────────────────────────────────────────
const ML = 44 // left gutter (y labels)
const MR = 12
const MT = 12
const MB = 26 // bottom gutter (x labels)
const H = computed(() => props.height)
const innerW = computed(() => Math.max(0, w.value - ML - MR))
const innerH = computed(() => Math.max(0, H.value - MT - MB))

const hasData = computed(() => props.points.length > 0 && props.points.some((p) => p > 0))

function niceMax(v: number): number {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * pow
}
const maxVal = computed(() => niceMax(Math.max(1, ...props.points)))

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'k'
  return String(Math.round(n))
}

// Point coordinates (px).
const coords = computed(() =>
  props.points.map((v, i) => {
    const x = props.points.length <= 1 ? ML + innerW.value / 2 : ML + (i / (props.points.length - 1)) * innerW.value
    const y = MT + innerH.value - (v / maxVal.value) * innerH.value
    return { x, y, v, i }
  }),
)
const linePath = computed(() =>
  coords.value.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
)
const areaPath = computed(() => {
  const cs = coords.value
  if (!cs.length) return ''
  const base = MT + innerH.value
  return `${linePath.value} L${cs[cs.length - 1]!.x.toFixed(1)},${base} L${cs[0]!.x.toFixed(1)},${base} Z`
})

// Y gridlines / ticks (5 lines: 0 … max).
const yTicks = computed(() => {
  const n = 4
  return Array.from({ length: n + 1 }, (_, k) => {
    const val = (maxVal.value / n) * k
    const y = MT + innerH.value - (val / maxVal.value) * innerH.value
    return { y, label: fmtNum(val) }
  })
})

// X labels — up to 5 evenly spaced (always include first + last/today).
const xLabels = computed(() => {
  const n = props.labels.length
  if (!n) return [] as { x: number; label: string }[]
  const want = Math.min(5, n)
  const idxs = new Set<number>()
  for (let k = 0; k < want; k++) idxs.add(Math.round((k / (want - 1 || 1)) * (n - 1)))
  return [...idxs].sort((a, b) => a - b).map((i) => ({ x: coords.value[i]?.x ?? ML, label: props.labels[i] ?? '' }))
})

const last = computed(() => coords.value[coords.value.length - 1] ?? null)

// ── Hover ───────────────────────────────────────────────────────────────
const hoverIdx = ref<number | null>(null)
function onMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  if (props.points.length < 2) {
    hoverIdx.value = props.points.length ? 0 : null
    return
  }
  const t = (x - ML) / (innerW.value || 1)
  hoverIdx.value = Math.max(0, Math.min(props.points.length - 1, Math.round(t * (props.points.length - 1))))
}
function onLeave() {
  hoverIdx.value = null
}
const hover = computed(() => (hoverIdx.value == null ? null : coords.value[hoverIdx.value] ?? null))
const hoverLabel = computed(() => (hoverIdx.value == null ? '' : props.labels[hoverIdx.value] ?? ''))
</script>

<template>
  <div ref="wrap" class="relative w-full" :style="{ height: H + 'px' }">
    <template v-if="hasData">
      <svg :width="w" :height="H" class="block" @mousemove="onMove" @mouseleave="onLeave">
        <defs>
          <linearGradient id="ts-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#B55430" stop-opacity="0.16" />
            <stop offset="100%" stop-color="#B55430" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Y gridlines + labels -->
        <g>
          <line
            v-for="(t, i) in yTicks"
            :key="'g' + i"
            :x1="ML"
            :y1="t.y"
            :x2="w - MR"
            :y2="t.y"
            stroke="var(--border)"
            stroke-width="1"
            :stroke-dasharray="i === 0 ? '0' : '3 3'"
          />
          <text
            v-for="(t, i) in yTicks"
            :key="'y' + i"
            :x="ML - 8"
            :y="t.y + 3"
            text-anchor="end"
            class="fill-neutral-400 text-[10px]"
          >
            {{ t.label }}
          </text>
        </g>

        <!-- Area + line -->
        <path :d="areaPath" fill="url(#ts-fill)" />
        <path :d="linePath" fill="none" stroke="#B55430" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

        <!-- Latest-point dot -->
        <circle v-if="last" :cx="last.x" :cy="last.y" r="3.5" fill="#B55430" stroke="var(--bg)" stroke-width="2" />

        <!-- X labels -->
        <text
          v-for="(l, i) in xLabels"
          :key="'x' + i"
          :x="l.x"
          :y="H - 8"
          :text-anchor="i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'"
          class="fill-neutral-400 text-[10px]"
        >
          {{ l.label }}
        </text>

        <!-- Hover crosshair -->
        <g v-if="hover">
          <line :x1="hover.x" :y1="MT" :x2="hover.x" :y2="MT + innerH" stroke="var(--border-strong, #cbbfb0)" stroke-width="1" />
          <circle :cx="hover.x" :cy="hover.y" r="4" fill="#B55430" stroke="var(--bg)" stroke-width="2" />
        </g>
      </svg>

      <!-- Tooltip -->
      <div
        v-if="hover"
        class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center shadow-pop"
        :style="{ left: Math.min(Math.max(hover.x, 60), w - 60) + 'px', top: (hover.y - 10) + 'px' }"
      >
        <div class="font-mono text-sm font-bold text-neutral-900">{{ hover.v.toLocaleString('en-NG') }}<span v-if="unit" class="ml-1 font-body text-[10px] font-normal text-neutral-400">{{ unit }}</span></div>
        <div class="whitespace-nowrap text-[10px] text-neutral-400">{{ hoverLabel }}</div>
      </div>
    </template>

    <div
      v-else
      class="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed border-line text-sm text-neutral-400"
    >
      <p>{{ empty }}</p>
    </div>
  </div>
</template>
