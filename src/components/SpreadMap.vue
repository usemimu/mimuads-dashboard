<script setup lang="ts">
import { computed } from 'vue'
import type { HeatmapPoint } from '@/api/contracts/field'

// Leaflet is not installed — rendering as a sortable table with intensity bars.
// When leaflet is added to package.json, replace this with a map render.

const props = withDefaults(
  defineProps<{
    points: HeatmapPoint[]
    height?: string
  }>(),
  { height: '400px' },
)

function nairaDisplay(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

const maxClaims = computed(() =>
  props.points.reduce((m, p) => Math.max(m, p.claims), 1),
)

const sorted = computed(() =>
  [...props.points].sort((a, b) => b.claims - a.claims),
)
</script>

<template>
  <div class="rounded-xl border border-clay-100 bg-white overflow-hidden" :style="{ maxHeight: height, overflowY: 'auto' }">
    <div v-if="!points.length" class="flex flex-col items-center justify-center py-16 text-clay-400">
      <p class="text-sm">No scout activity yet</p>
      <p class="text-xs mt-1">Claims will appear here as scouts engage their networks</p>
    </div>

    <table v-else class="w-full text-sm">
      <thead class="sticky top-0 bg-clay-50 border-b border-clay-100">
        <tr>
          <th class="px-4 py-2.5 text-left text-xs font-medium text-clay-500 uppercase tracking-wide">Area</th>
          <th class="px-4 py-2.5 text-left text-xs font-medium text-clay-500 uppercase tracking-wide">Claims</th>
          <th class="px-4 py-2.5 text-left text-xs font-medium text-clay-500 uppercase tracking-wide">Earned</th>
          <th class="px-4 py-2.5 text-left text-xs font-medium text-clay-500 uppercase tracking-wide min-w-[120px]">Intensity</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-clay-50">
        <tr v-for="p in sorted" :key="p.geohash6" class="hover:bg-clay-50/50 transition-colors">
          <td class="px-4 py-2.5">
            <code class="text-xs text-clay-600 font-mono bg-clay-50 px-1.5 py-0.5 rounded">{{ p.geohash6 }}</code>
            <span v-if="p.lat && p.lng" class="ml-2 text-xs text-clay-400">
              {{ p.lat.toFixed(3) }}, {{ p.lng.toFixed(3) }}
            </span>
          </td>
          <td class="px-4 py-2.5 font-medium text-clay-900">{{ p.claims.toLocaleString() }}</td>
          <td class="px-4 py-2.5 text-clay-600">{{ nairaDisplay(p.totalEarnedKobo) }}</td>
          <td class="px-4 py-2.5">
            <div class="h-2 rounded-full bg-clay-100 overflow-hidden">
              <div
                class="h-full rounded-full bg-orange-500 transition-all"
                :style="{ width: `${Math.round((p.claims / maxClaims) * 100)}%` }"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
