<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Tabs from '@/components/ui/Tabs.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import OfferCard from '@/components/OfferCard.vue'
import { PhPlay, PhCurrencyNgn, PhChartLineUp, PhUsersThree } from '@phosphor-icons/vue'
import { statusTone, statusLabel } from '@/lib/status'
import { useSession } from '@/stores/session'
import {
  getCampaign, getPerformance, getPerformanceBreakdown, getDecisionFactors,
  getCampaignSummaries,
  pauseCampaign, resumeCampaign, topUpCampaign, extendCampaign, cloneCampaign,
} from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const session = useSession()
const qc = useQueryClient()
const toast = useToastStore()
const { t } = useI18n()
const id = computed(() => String(route.params.id))

const { data: c } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaign', id.value)),
  queryFn: () => getCampaign(id.value),
})

const pacing = computed(() => {
  if (!c.value) return 0
  const b = Number(c.value.budgetKobo), sp = Number(c.value.spentKobo)
  return b > 0 ? Math.min(100, Math.round((sp / b) * 100)) : 0
})

type PerfTab = 'overall' | 'by-screen' | 'by-hour' | 'by-day'
const tab = ref<PerfTab>('overall')
const perfTabs = computed<ReadonlyArray<{ value: PerfTab; label: string }>>(() => [
  { value: 'overall', label: t('campaigns.tabOverall') },
  { value: 'by-screen', label: t('campaigns.tabByScreen') },
  { value: 'by-hour', label: t('campaigns.tabByHour') },
  { value: 'by-day', label: t('campaigns.tabByDay') },
])
const { data: perf } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'perf', id.value, tab.value)),
  queryFn: () => (tab.value === 'overall' ? getPerformance(id.value) : getPerformanceBreakdown(id.value, tab.value)),
})
const { data: factors } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'factors', id.value)),
  queryFn: () => getDecisionFactors(id.value),
})
const factorList = computed(() => {
  const f = factors.value as { factors?: Array<{ label?: string; name?: string; weight?: number; value?: number }> } | undefined
  return f?.factors ?? []
})

// ── Performance (untyped API responses → typed accessors) ─────────────
interface Overall {
  metrics?: { totalPlays?: number; totalImpressions?: number; totalAttentionSeconds?: number; averageAttentionSeconds?: number }
  pacing?: { status?: string; daysElapsed?: number; daysRemaining?: number; formattedExpectedSpend?: string }
  timeline?: { startDate?: string; endDate?: string; lastPlayAt?: string | null }
}
interface BreakdownRow {
  label: string
  plays: number
  formattedCost?: string
}
const overall = computed<Overall | null>(() => (tab.value === 'overall' ? ((perf.value as Overall) ?? null) : null))

// Plays-first metrics (CV impressions/attention deferred until screens have cameras).
const overallPlays = computed(() => overall.value?.metrics?.totalPlays ?? 0)
const cpmPerKPlays = computed(() => {
  const spent = Number(c.value?.spentKobo ?? 0)
  return overallPlays.value > 0 ? Math.round((spent / overallPlays.value) * 1000) : 0
})
// Modeled reach (sensor-free) for this campaign, from the summaries endpoint.
const { data: campaignSummaries } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaign-summaries')),
  queryFn: getCampaignSummaries,
})
const estReach = computed(
  () => campaignSummaries.value?.campaigns.find((x) => x.campaignId === id.value)?.estimatedReach ?? 0,
)

function formatHour(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric' })
}
function shortDate(d: string): string {
  const t = Date.parse(d)
  if (Number.isNaN(t)) return d
  return new Date(t).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

const rows = computed<BreakdownRow[]>(() => {
  if (!perf.value || tab.value === 'overall') return []
  const p = perf.value as { screens?: unknown[]; hours?: unknown[]; days?: unknown[] }
  const arr = (p.screens ?? p.hours ?? p.days ?? []) as Array<Record<string, unknown>>
  return arr.map((r) => ({
    label: (r.screenName as string) ?? (r.hour ? formatHour(r.hour as string) : (r.date as string)) ?? '—',
    plays: (r.plays as number) ?? 0,
    formattedCost: r.formattedCost as string | undefined,
  }))
})

const pacingTone = computed(() => {
  const s = overall.value?.pacing?.status
  if (s === 'ahead') return 'info'
  if (s === 'behind') return 'danger'
  return 'success' // on_track / default
})
const breakdownColLabel = computed(() =>
  tab.value === 'by-screen' ? t('campaigns.perf.colScreen') : t('campaigns.perf.colWhen'),
)

async function run(fn: () => Promise<unknown>) {
  try {
    await fn()
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'campaign', id.value) })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Action failed')
  }
}
function onTopup() {
  const naira = Number(window.prompt('Top-up amount (₦)?') ?? '')
  if (naira > 0) run(() => topUpCampaign(id.value, String(nairaToKobo(naira)), 'topup-' + Date.now()))
}
function onExtend() {
  const d = window.prompt('New end date (YYYY-MM-DD)?')
  if (d) run(() => extendCampaign(id.value, new Date(`${d}T00:00:00Z`).toISOString()))
}
async function onClone() {
  try {
    const clone = await cloneCampaign(id.value)
    router.push(`/campaigns/${clone.id}`)
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Clone failed')
  }
}
</script>

<template>
  <div v-if="c" class="max-w-4xl">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="font-display text-3xl font-semibold leading-none text-neutral-900 sm:text-4xl">
          {{ c.name }}
        </h1>
        <div class="mt-2.5 flex items-center gap-2">
          <Badge :tone="statusTone(c.status)">{{ statusLabel(c.status) }}</Badge>
          <span class="text-sm capitalize text-neutral-500">{{ c.objective }}</span>
        </div>
      </div>
      <div v-if="session.canMutate" class="flex flex-wrap gap-2">
        <Button v-if="c.status === 'active'" size="sm" variant="secondary" @click="run(() => pauseCampaign(id))">{{ $t('campaigns.pause') }}</Button>
        <Button v-if="c.status === 'paused'" size="sm" variant="secondary" @click="run(() => resumeCampaign(id))">{{ $t('campaigns.resume') }}</Button>
        <Button size="sm" variant="secondary" @click="onTopup">{{ $t('campaigns.topup') }}</Button>
        <Button size="sm" variant="secondary" @click="onExtend">{{ $t('campaigns.extend') }}</Button>
        <Button size="sm" variant="outline" @click="onClone">{{ $t('campaigns.clone') }}</Button>
      </div>
    </div>

    <!-- Pacing -->
    <Card class="mb-5">
      <div class="mb-2.5 flex items-center justify-between text-sm">
        <span class="font-medium text-neutral-700">{{ $t('campaigns.pacing') }}</span>
        <span class="font-mono text-neutral-600">{{ formatKobo(c.spentKobo) }} / {{ formatKobo(c.budgetKobo) }}</span>
      </div>
      <div class="h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div class="h-full rounded-full bg-clay-500 transition-all" :style="{ width: pacing + '%' }" />
      </div>
      <div class="mt-2 flex items-center justify-between text-xs">
        <!-- Committed CPM locked at submit — the rate billing meters against.
             Hidden on legacy rows that predate the locked rate. -->
        <span v-if="c.formattedBidCpm" class="text-neutral-400">
          {{ $t('campaigns.cpmRate') }} <span class="font-mono text-neutral-600">{{ c.formattedBidCpm }}</span>
        </span>
        <span v-else />
        <span class="font-medium text-neutral-400">{{ pacing }}%</span>
      </div>
    </Card>

    <!-- Offer -->
    <OfferCard :campaign-id="id" />

    <!-- Performance tabs -->
    <Card padding="none" class="mb-5 overflow-hidden">
      <div class="px-5 pt-1">
        <Tabs v-model="tab" :tabs="perfTabs" />
      </div>
      <div class="p-5">
        <!-- Overall: metric tiles + pacing + timeline -->
        <template v-if="tab === 'overall'">
          <div v-if="overall" class="space-y-5">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricTile :label="$t('campaigns.perf.plays')" :value="overallPlays.toLocaleString('en-NG')" :icon="PhPlay" />
              <MetricTile :label="$t('campaigns.perf.estReach')" :value="estReach ? estReach.toLocaleString('en-NG') : '—'" :sub="$t('campaigns.perf.estReachHint')" :icon="PhUsersThree" />
              <MetricTile :label="$t('campaigns.perf.spend')" :value="formatKobo(c?.spentKobo ?? '0', { showDecimals: false })" :icon="PhCurrencyNgn" />
              <MetricTile :label="$t('campaigns.perf.cpmPlays')" :value="cpmPerKPlays ? formatKobo(String(cpmPerKPlays)) : '—'" :icon="PhChartLineUp" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-line p-4">
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ $t('campaigns.perf.pacingStatus') }}</p>
                <Badge :tone="pacingTone" class="capitalize">{{ (overall.pacing?.status ?? '—').replace(/_/g, ' ') }}</Badge>
                <dl class="mt-3 space-y-1.5 text-sm">
                  <div class="flex justify-between"><dt class="text-neutral-500">{{ $t('campaigns.perf.daysElapsed') }}</dt><dd class="font-mono text-neutral-700">{{ overall.pacing?.daysElapsed ?? 0 }}</dd></div>
                  <div class="flex justify-between"><dt class="text-neutral-500">{{ $t('campaigns.perf.daysRemaining') }}</dt><dd class="font-mono text-neutral-700">{{ overall.pacing?.daysRemaining ?? 0 }}</dd></div>
                  <div class="flex justify-between"><dt class="text-neutral-500">{{ $t('campaigns.perf.expectedSpend') }}</dt><dd class="font-mono text-neutral-700">{{ overall.pacing?.formattedExpectedSpend ?? '—' }}</dd></div>
                </dl>
              </div>
              <div class="rounded-xl border border-line p-4">
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ $t('campaigns.perf.timeline') }}</p>
                <dl class="space-y-1.5 text-sm">
                  <div class="flex justify-between"><dt class="text-neutral-500">{{ $t('campaigns.perf.starts') }}</dt><dd class="text-neutral-700">{{ overall.timeline?.startDate ? shortDate(overall.timeline.startDate) : '—' }}</dd></div>
                  <div class="flex justify-between"><dt class="text-neutral-500">{{ $t('campaigns.perf.ends') }}</dt><dd class="text-neutral-700">{{ overall.timeline?.endDate ? shortDate(overall.timeline.endDate) : '—' }}</dd></div>
                  <div class="flex justify-between"><dt class="text-neutral-500">{{ $t('campaigns.perf.lastPlay') }}</dt><dd class="text-neutral-700">{{ overall.timeline?.lastPlayAt ? shortDate(overall.timeline.lastPlayAt) : $t('campaigns.perf.never') }}</dd></div>
                </dl>
              </div>
            </div>
          </div>
          <p v-else class="py-6 text-center text-sm text-neutral-400">{{ $t('common.loading') }}</p>
        </template>

        <!-- Breakdown table (screen / hour / day) -->
        <template v-else>
          <div v-if="rows.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-line text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <tr>
                  <th class="py-2 pr-3 font-semibold">{{ breakdownColLabel }}</th>
                  <th class="px-3 py-2 text-right font-semibold">{{ $t('campaigns.perf.colPlays') }}</th>
                  <th class="py-2 pl-3 text-right font-semibold">{{ $t('campaigns.perf.colCost') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in rows" :key="i" class="border-b border-neutral-100 last:border-0">
                  <td class="py-2 pr-3 text-neutral-900">{{ r.label }}</td>
                  <td class="px-3 py-2 text-right font-mono text-neutral-700">{{ r.plays.toLocaleString('en-NG') }}</td>
                  <td class="py-2 pl-3 text-right font-mono text-neutral-700">{{ r.formattedCost ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="py-8 text-center text-sm text-neutral-400">{{ $t('campaigns.perf.empty') }}</p>
        </template>
      </div>
    </Card>

    <!-- Decision factors -->
    <Card>
      <h2 class="mb-4 font-display text-lg font-semibold text-neutral-900">{{ $t('campaigns.decisionFactors') }}</h2>
      <div v-if="factorList.length" class="space-y-3">
        <div v-for="(f, i) in factorList" :key="i">
          <div class="mb-1 flex justify-between text-xs">
            <span class="font-medium text-neutral-600">{{ f.label ?? f.name }}</span>
            <span class="font-mono text-neutral-400">{{ Math.round((f.weight ?? f.value ?? 0) * 100) }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div class="h-full rounded-full bg-moss-400" :style="{ width: Math.round((f.weight ?? f.value ?? 0) * 100) + '%' }" />
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-neutral-400">{{ $t('common.comingSoon') }}</p>
    </Card>
  </div>
</template>
