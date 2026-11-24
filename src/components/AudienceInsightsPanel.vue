<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useSession } from '@/stores/session'
import { ctxKey } from '@/lib/ctx-key'
import { getCampaignDataExport, getLookalikeAudience } from '@/api/analytics'

const props = defineProps<{ campaignId: string }>()
const session = useSession()
const router = useRouter()

const { data: exportData, isPending: exportPending } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'data-export', props.campaignId)),
  queryFn: () => getCampaignDataExport(props.campaignId),
})

const { data: lookalike, isPending: lookalikePending } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'lookalike', props.campaignId)),
  queryFn: () => getLookalikeAudience(props.campaignId),
})

// ── Venue type bars ──────────────────────────────────────────────────
const venueTypeBars = computed(() => {
  const patterns = exportData.value?.audienceVisitPatterns ?? []
  const counts = new Map<string, number>()
  for (const p of patterns as any[]) {
    const vt = p.venue_type as string
    if (vt) counts.set(vt, (counts.get(vt) ?? 0) + Number(p.visit_count ?? 0))
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const max = sorted[0]?.[1] ?? 1
  return sorted.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
})

// ── Peak time heatmap (day × 3-hour band) ───────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_BANDS = ['0–3', '3–6', '6–9', '9–12', '12–15', '15–18', '18–21', '21–24']

const heatmapGrid = computed(() => {
  const patterns = exportData.value?.audienceVisitPatterns ?? []
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(8).fill(0))
  for (const p of patterns as any[]) {
    const d = Number(p.day_of_week)
    const h = Number(p.hour_of_day)
    if (d >= 0 && d < 7 && h >= 0 && h < 24) {
      grid[d][Math.floor(h / 3)] += Number(p.visit_count ?? 0)
    }
  }
  const max = Math.max(...grid.flat(), 1)
  return grid.map((row, d) => ({
    day: DAYS[d],
    cells: row.map(v => ({ raw: v, opacity: Math.round((v / max) * 100) })),
  }))
})

// ── Look-alike summary ───────────────────────────────────────────────
const matchCount = computed(() => lookalike.value?.lookalikes.length ?? 0)
const topPatternLabels = computed(() => {
  const patterns = lookalike.value?.topPatterns
  if (!patterns) return []
  const labels: string[] = []
  for (const vt of patterns.venueTypes.slice(0, 3)) {
    const area = patterns.geohash5s[0] ?? ''
    const dayLabel = patterns.peakDays.length ? DAYS[patterns.peakDays[0]] : ''
    labels.push(`${vt}${area ? ' · ' + area : ''}${dayLabel ? ' on ' + dayLabel + 's' : ''}`)
  }
  return labels
})

const creatingOutreach = ref(false)
async function createOutreachCampaign() {
  if (!lookalike.value?.suggestedTarget) return
  creatingOutreach.value = true
  try {
    const params = new URLSearchParams({
      type: 'outreach',
      geohash5: lookalike.value.suggestedTarget.geohash5Areas.join(','),
      venueTypes: lookalike.value.suggestedTarget.venueTypes.join(','),
    })
    router.push(`/campaigns/new?${params.toString()}`)
  } finally {
    creatingOutreach.value = false
  }
}

// ── Recommendations ──────────────────────────────────────────────────
const recommendations = computed(() => {
  const summary = exportData.value?.summary
  const patterns = lookalike.value?.topPatterns
  const recs: string[] = []
  if (summary?.peakDay && summary?.peakHour)
    recs.push(`Best time to send: ${summary.peakDay.trim()} around ${summary.peakHour}`)
  if (exportData.value?.topGeohash5Areas[0])
    recs.push(`Top area to target: ${exportData.value.topGeohash5Areas[0].geohash5} (${exportData.value.topGeohash5Areas[0].claimCount.toLocaleString()} claims)`)
  if (matchCount.value > 0 && patterns?.venueTypes[0])
    recs.push(`${matchCount.value.toLocaleString()} similar subscribers match your claimers' patterns — reach them with Outreach`)
  return recs
})
</script>

<template>
  <div class="space-y-6">

    <!-- Loading -->
    <div v-if="exportPending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-8 bg-neutral-100 rounded-lg animate-pulse" />
    </div>

    <template v-else-if="exportData">
      <!-- Section 1: Claimers profile -->
      <div>
        <h3 class="mb-3 text-sm font-semibold text-neutral-700">Who claimed your offer</h3>

        <!-- Venue type bars -->
        <div v-if="venueTypeBars.length" class="mb-5 space-y-2">
          <div v-for="bar in venueTypeBars" :key="bar.name" class="flex items-center gap-3">
            <span class="w-32 shrink-0 text-xs text-neutral-600 truncate capitalize">{{ bar.name }}</span>
            <div class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div class="h-full rounded-full bg-orange-400 transition-all" :style="{ width: bar.pct + '%' }" />
            </div>
            <span class="w-10 shrink-0 text-right text-xs text-neutral-400">{{ bar.count.toLocaleString() }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-neutral-400">No visit pattern data yet — data builds as subscribers claim and explore.</p>

        <!-- Peak time heatmap -->
        <div v-if="heatmapGrid.some(row => row.cells.some(c => c.raw > 0))" class="mt-4">
          <p class="mb-2 text-xs font-medium text-neutral-500">Peak activity (day × time)</p>
          <div class="overflow-x-auto">
            <table class="text-[10px] text-neutral-500">
              <thead>
                <tr>
                  <th class="w-8" />
                  <th v-for="band in HOUR_BANDS" :key="band" class="px-1 pb-1 font-normal text-center">{{ band }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in heatmapGrid" :key="row.day">
                  <td class="pr-2 font-medium">{{ row.day }}</td>
                  <td v-for="(cell, i) in row.cells" :key="i" class="p-0.5">
                    <div
                      class="w-7 h-5 rounded"
                      :class="cell.opacity > 0 ? 'bg-orange-400' : 'bg-neutral-100'"
                      :style="cell.opacity > 0 ? { opacity: Math.max(0.15, cell.opacity / 100) } : {}"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Section 2: Look-alike audience -->
      <div class="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
        <div v-if="lookalikePending" class="h-16 animate-pulse" />
        <template v-else-if="lookalike">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-neutral-900">
                {{ matchCount.toLocaleString() }} similar subscribers
              </p>
              <p class="mt-0.5 text-xs text-neutral-500">
                {{ lookalike.seedSize.toLocaleString() }} claimers used as seed
              </p>
            </div>
            <button
              v-if="matchCount > 0 && lookalike.suggestedTarget"
              @click="createOutreachCampaign"
              :disabled="creatingOutreach"
              class="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Create Outreach →
            </button>
          </div>
          <ul v-if="topPatternLabels.length" class="mt-3 space-y-1">
            <li v-for="label in topPatternLabels" :key="label" class="flex items-center gap-2 text-xs text-neutral-600">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              {{ label }}
            </li>
          </ul>
          <p v-else-if="matchCount === 0" class="mt-2 text-xs text-neutral-400">
            More data needed — look-alike scoring requires at least a few claims with visit history.
          </p>
        </template>
      </div>

      <!-- Section 3: Targeting recommendations -->
      <div v-if="recommendations.length">
        <h3 class="mb-2 text-sm font-semibold text-neutral-700">Recommendations</h3>
        <ul class="space-y-2">
          <li
            v-for="rec in recommendations"
            :key="rec"
            class="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2.5 text-xs text-orange-900"
          >
            <span class="mt-0.5 shrink-0 text-orange-400">→</span>
            {{ rec }}
          </li>
        </ul>
      </div>
    </template>

    <div v-else class="py-8 text-center text-sm text-neutral-400">
      No audience data yet — audience insights build as your campaign runs.
    </div>

  </div>
</template>
