<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Tabs from '@/components/ui/Tabs.vue'
import MetricTile from '@/components/dashboard/MetricTile.vue'
import OfferCard from '@/components/OfferCard.vue'
import { PhPlay, PhCurrencyNgn, PhChartLineUp, PhUsersThree, PhFilmSlate, PhVideoCamera, PhImage, PhStack, PhArrowLeft, PhEnvelope } from '@phosphor-icons/vue'
import { getCarousel } from '@/api/carousel'
import { getOffer, getCampaignLeads, markLeadViewed } from '@/api/offers'
import type { Lead } from '@/api/contracts/offers'
import { getOutreachStats } from '@/api/outreach'
import { getFieldCampaign, getSpreadHeatmap, getTopScouts, createFieldCampaign } from '@/api/field'
import type { FieldCampaign } from '@/api/contracts/field'
import SpreadMap from '@/components/SpreadMap.vue'
import FieldCampaignTasksTab from '@/components/field/FieldCampaignTasksTab.vue'
import AudienceInsightsPanel from '@/components/AudienceInsightsPanel.vue'
import { statusTone, statusLabel } from '@/lib/status'
import { useSession } from '@/stores/session'
import {
  getCampaign, getPerformance, getPerformanceBreakdown, getDecisionFactors,
  getCampaignSummaries, getOutreachPerformance, getFieldPerformance, getScoutLeaderboard,
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

type PerfTab = 'overall' | 'by-screen' | 'by-creative' | 'by-hour' | 'by-day' | 'audience'
const tab = ref<PerfTab>('overall')
const perfTabs = computed<ReadonlyArray<{ value: PerfTab; label: string }>>(() => [
  { value: 'overall', label: t('campaigns.tabOverall') },
  { value: 'by-screen', label: t('campaigns.tabByScreen') },
  { value: 'by-creative', label: 'By creative' },
  { value: 'by-hour', label: t('campaigns.tabByHour') },
  { value: 'by-day', label: t('campaigns.tabByDay') },
  { value: 'audience', label: 'Audience' },
])
// Overall perf is always fetched (drives the Overall tab tiles AND the sidebar
// details/pacing, which must stay populated regardless of the active tab).
const { data: perfOverall } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'perf', id.value, 'overall')),
  queryFn: () => getPerformance(id.value),
})
// Breakdown perf only loads when a breakdown tab is active.
const { data: perf } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'perf', id.value, tab.value)),
  queryFn: () => getPerformanceBreakdown(id.value, tab.value as 'by-screen' | 'by-creative' | 'by-hour' | 'by-day'),
  enabled: computed(() => tab.value !== 'overall' && tab.value !== 'audience'),
})
const { data: factors } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'factors', id.value)),
  queryFn: () => getDecisionFactors(id.value),
})
const factorList = computed(() => {
  const f = factors.value as { factors?: Array<{ label?: string; name?: string; weight?: number; value?: number }> } | undefined
  return f?.factors ?? []
})

// Offer (needed to know ctaType so we can conditionally show leads)
const { data: offer } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'offer', id.value)),
  queryFn: () => getOffer(id.value),
})
const isB2b = computed(() => offer.value?.ctaType === 'b2b_inquiry')

// Leads — only fetched when the offer is b2b_inquiry
const { data: leadsData, refetch: refetchLeads } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'leads', id.value)),
  queryFn: () => getCampaignLeads(id.value),
  enabled: isB2b,
})
const leads = computed<Lead[]>(() => leadsData.value ?? [])
const newLeadCount = computed(() => leads.value.filter((l) => l.status === 'new').length)

async function onLeadClick(lead: Lead) {
  if (lead.status === 'new') {
    await markLeadViewed(id.value, lead.id).catch(() => {})
    refetchLeads()
  }
}

// Outreach stats — only for outreach campaigns
const isOutreach = computed(() => c.value?.type === 'outreach')
const { data: outreachStats } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'outreach-stats', id.value)),
  queryFn: () => getOutreachStats(id.value),
  enabled: isOutreach,
})

// Field campaign — screen campaigns can optionally have a people-powered referral layer
const isScreen = computed(() => !c.value?.type || c.value.type === 'screen')
const { data: fieldCampaignData, refetch: refetchField } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'field-campaign', id.value)),
  queryFn: () => getFieldCampaign(id.value),
  enabled: isScreen,
})
const fieldCampaign = computed<FieldCampaign | null>(() => fieldCampaignData.value ?? null)

const { data: heatmapData } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'field-heatmap', id.value)),
  queryFn: () => getSpreadHeatmap(id.value),
  enabled: computed(() => !!fieldCampaign.value),
})
const heatmapPoints = computed(() => heatmapData.value ?? [])

const { data: topScoutsData } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'field-scouts', id.value)),
  queryFn: () => getTopScouts(id.value),
  enabled: computed(() => !!fieldCampaign.value),
})
const topScouts = computed(() => topScoutsData.value ?? [])

// New performance endpoints (open/click, scout economics). Untyped responses.
const { data: outreachPerfData } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'outreach-perf', id.value)),
  queryFn: () => getOutreachPerformance(id.value),
  enabled: isOutreach,
})
const outreachPerf = computed(() => outreachPerfData.value as {
  delivery?: { totalSent?: number; totalFailed?: number; totalOpened?: number; totalClicked?: number; openRate?: number; clickRate?: number; costPerSendNaira?: number }
} | undefined)

const { data: fieldPerfData } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'field-perf', id.value)),
  queryFn: () => getFieldPerformance(id.value),
  enabled: computed(() => !!fieldCampaign.value),
})
const fieldPerf = computed(() => fieldPerfData.value as {
  pool?: { poolUtilization?: number }
  scouts?: { totalRedemptions?: number; redemptionRate?: number; totalEarnedNaira?: number }
} | undefined)

const { data: scoutLbData } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'scout-lb', id.value)),
  queryFn: () => getScoutLeaderboard(id.value),
  enabled: computed(() => !!fieldCampaign.value),
})
const scoutLeaderboard = computed(() => (scoutLbData.value as {
  scouts?: Array<{ rank: number; scoutId: string; scoutName: string; referrals: number; redemptions: number; earnedNaira: number }>
} | undefined)?.scouts ?? [])

const showFieldCreate = ref(false)
const fieldCreateForm = ref({ name: '', budgetPool: '', startDate: c.value?.startDate?.slice(0, 10) ?? '', endDate: c.value?.endDate?.slice(0, 10) ?? '' })
type FieldTab = 'overview' | 'tasks'
const fieldTab = ref<FieldTab>('overview')

async function onCreateField() {
  if (!fieldCreateForm.value.name || !fieldCreateForm.value.budgetPool) return
  try {
    await createFieldCampaign(id.value, {
      name: fieldCreateForm.value.name,
      budgetPoolKobo: String(Math.round(parseFloat(fieldCreateForm.value.budgetPool) * 100)),
      startDate: new Date(fieldCreateForm.value.startDate + 'T00:00:00Z').toISOString(),
      endDate: new Date(fieldCreateForm.value.endDate + 'T00:00:00Z').toISOString(),
    })
    showFieldCreate.value = false
    refetchField()
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Failed to create field campaign')
  }
}

// ── Performance (untyped API responses → typed accessors) ─────────────
interface Overall {
  metrics?: {
    totalPlays?: number
    totalImpressions?: number
    totalAttentionSeconds?: number
    averageAttentionSeconds?: number
    // Vision model (0 until screens have cameras — surfaced only when > 0)
    attentionRate?: number
    completionRate?: number
    bleReach?: number
    demographics?: { male?: number; female?: number; child?: number; adult?: number; senior?: number }
  }
  pacing?: { status?: string; daysElapsed?: number; daysRemaining?: number; formattedExpectedSpend?: string }
  timeline?: { startDate?: string; endDate?: string; lastPlayAt?: string | null }
}
interface BreakdownRow {
  label: string
  plays: number
  formattedCost?: string
  // Present only on by-screen rows: did the booked slots actually play?
  fillRate?: number
}
const overall = computed<Overall | null>(() => (perfOverall.value as Overall) ?? null)

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

// Creative preview for the sidebar. Carousels have no poster — lazily fetch the
// first image frame as a cover (same approach as the campaigns grid).
const creativeFmt = computed(
  () => (c.value?.creativeFormat ?? (c.value?.creative as { format?: string } | undefined)?.format) as
    | 'video'
    | 'image'
    | 'carousel'
    | undefined,
)
const carouselCover = ref<string | null>(null)
const carouselPreviewItems = ref<Array<{ id: string; sequence: number; format: string; dwellSeconds: number; cdnUrl?: string | null }>>([])
watch(
  c,
  (cam) => {
    carouselCover.value = null
    carouselPreviewItems.value = []
    if (!cam || cam.posterUrl) return
    const f = cam.creativeFormat ?? (cam.creative as { format?: string } | undefined)?.format
    if (f !== 'carousel') return
    const cid = (cam.creative as { id?: string } | undefined)?.id
    if (!cid) return
    getCarousel(cid)
      .then((res) => {
        const items = (res.items ?? []) as Array<{ id: string; sequence: number; cdnUrl?: string | null; format: string; dwellSeconds: number }>
        carouselPreviewItems.value = [...items].sort((a, b) => a.sequence - b.sequence)
        const first = items.find((i) => i.cdnUrl && i.format === 'image') ?? items.find((i) => i.cdnUrl)
        carouselCover.value = first?.cdnUrl ?? null
      })
      .catch(() => {})
  },
  { immediate: true },
)
const coverUrl = computed(() => c.value?.posterUrl || carouselCover.value || null)
const daysLeft = computed(() =>
  c.value?.endDate ? Math.max(0, Math.ceil((Date.parse(c.value.endDate) - Date.now()) / 86_400_000)) : null,
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
    fillRate: typeof r.fillRate === 'number' ? (r.fillRate as number) : undefined,
  }))
})

// Vision/quality headline metrics — each only shown when the signal exists
// (CV-less screens report 0; we don't clutter the plays-first view with zeros).
const attentionRatePct = computed(() => {
  const r = overall.value?.metrics?.attentionRate ?? 0
  return r > 0 ? Math.round(r * 100) : null
})
const completionRatePct = computed(() => {
  const r = overall.value?.metrics?.completionRate ?? 0
  return r > 0 ? Math.round(r * 100) : null
})
const bleReach = computed(() => overall.value?.metrics?.bleReach ?? 0)
const showFill = computed(() => tab.value === 'by-screen')

interface CreativeRow {
  creativeId: string
  creativeName: string
  plays: number
  attentionRate: number
  completionRate: number
  costNaira: number
}
const creativeRows = computed<CreativeRow[]>(() => {
  if (tab.value !== 'by-creative' || !perf.value) return []
  const arr = ((perf.value as { creatives?: unknown[] }).creatives ?? []) as Array<Record<string, unknown>>
  return arr.map((r) => ({
    creativeId: (r.creativeId as string) ?? '',
    creativeName: (r.creativeName as string) ?? 'Creative',
    plays: (r.plays as number) ?? 0,
    attentionRate: (r.attentionRate as number) ?? 0,
    completionRate: (r.completionRate as number) ?? 0,
    costNaira: (r.costNaira as number) ?? 0,
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
  <div v-if="c">
    <!-- Header -->
    <div class="mb-6 min-w-0">
      <RouterLink to="/campaigns" class="mb-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-clay-600">
        <PhArrowLeft :size="13" /> {{ $t('nav.campaigns') }}
      </RouterLink>
      <h1 class="font-body text-3xl font-bold leading-none tracking-tight text-neutral-900 sm:text-4xl">
        {{ c.name }}
      </h1>
      <div class="mt-2.5 flex flex-wrap items-center gap-2">
        <Badge :tone="statusTone(c.status)" dot>{{ statusLabel(c.status) }}</Badge>
        <span class="text-sm capitalize text-neutral-500">{{ c.objective }}</span>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
      <!-- ── MAIN ─────────────────────────────────────────────── -->
      <div class="space-y-5 lg:col-span-2">
        <!-- Performance tabs -->
        <Card padding="none" class="overflow-hidden">
          <div class="px-5 pt-1">
            <Tabs v-model="tab" :tabs="perfTabs" />
          </div>
          <div class="p-5">
            <!-- Overall: headline tiles -->
            <template v-if="tab === 'overall'">
              <div v-if="overall" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricTile :label="$t('campaigns.perf.plays')" :value="overallPlays.toLocaleString('en-NG')" :icon="PhPlay" />
                <MetricTile :label="$t('campaigns.perf.estReach')" :value="estReach ? estReach.toLocaleString('en-NG') : '—'" :sub="$t('campaigns.perf.estReachHint')" :icon="PhUsersThree" />
                <MetricTile :label="$t('campaigns.perf.spend')" :value="formatKobo(c?.spentKobo ?? '0', { showDecimals: false })" :icon="PhCurrencyNgn" />
                <MetricTile :label="$t('campaigns.perf.cpmPlays')" :value="cpmPerKPlays ? formatKobo(String(cpmPerKPlays)) : '—'" :icon="PhChartLineUp" />
                <!-- Vision + anonymous-reach signals: appear as cameras/BLE come online -->
                <MetricTile v-if="attentionRatePct !== null" label="Attention rate" :value="`${attentionRatePct}%`" sub="Looked vs passed by" :icon="PhUsersThree" />
                <MetricTile v-if="completionRatePct !== null" label="Completion rate" :value="`${completionRatePct}%`" sub="Full plays" :icon="PhChartLineUp" />
                <MetricTile v-if="bleReach > 0" label="Anonymous reach" :value="bleReach.toLocaleString('en-NG')" sub="BLE footfall (camera-less)" :icon="PhUsersThree" />
              </div>
              <p v-else class="py-6 text-center text-sm text-neutral-400">{{ $t('common.loading') }}</p>
            </template>

            <!-- Audience insights -->
            <template v-else-if="tab === 'audience'">
              <AudienceInsightsPanel :campaign-id="id" />
            </template>

            <!-- By creative: which creative earns attention / completes -->
            <template v-else-if="tab === 'by-creative'">
              <div v-if="creativeRows.length" class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="border-b border-line text-left text-[11px] uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th class="py-2 pr-3 font-semibold">Creative</th>
                      <th class="px-3 py-2 text-right font-semibold">{{ $t('campaigns.perf.colPlays') }}</th>
                      <th class="px-3 py-2 text-right font-semibold">Attention</th>
                      <th class="px-3 py-2 text-right font-semibold">Completion</th>
                      <th class="py-2 pl-3 text-right font-semibold">{{ $t('campaigns.perf.colCost') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in creativeRows" :key="r.creativeId" class="border-b border-line last:border-0">
                      <td class="py-2 pr-3 text-neutral-900">{{ r.creativeName }}</td>
                      <td class="px-3 py-2 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.plays.toLocaleString('en-NG') }}</td>
                      <td class="px-3 py-2 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.attentionRate > 0 ? `${Math.round(r.attentionRate * 100)}%` : '—' }}</td>
                      <td class="px-3 py-2 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.completionRate > 0 ? `${Math.round(r.completionRate * 100)}%` : '—' }}</td>
                      <td class="py-2 pl-3 text-right font-display text-[13px] font-medium text-neutral-700">₦{{ r.costNaira.toLocaleString('en-NG') }}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="mt-2 text-[11px] text-neutral-400">Attention + completion are 0 until screens have cameras; plays and cost are live.</p>
              </div>
              <div v-else class="flex flex-col items-center py-8 text-center text-sm text-neutral-400">
                <MimuIcon name="dashboard" variant="sticker" :size="104" class="mb-2" />
                {{ $t('campaigns.perf.empty') }}
              </div>
            </template>

            <!-- Breakdown table (screen / hour / day) -->
            <template v-else>
              <div v-if="rows.length" class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="border-b border-line text-left text-[11px] uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th class="py-2 pr-3 font-semibold">{{ breakdownColLabel }}</th>
                      <th class="px-3 py-2 text-right font-semibold">{{ $t('campaigns.perf.colPlays') }}</th>
                      <th v-if="showFill" class="px-3 py-2 text-right font-semibold">Fill</th>
                      <th class="py-2 pl-3 text-right font-semibold">{{ $t('campaigns.perf.colCost') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in rows" :key="i" class="border-b border-line last:border-0">
                      <td class="py-2 pr-3 text-neutral-900">{{ r.label }}</td>
                      <td class="px-3 py-2 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.plays.toLocaleString('en-NG') }}</td>
                      <td v-if="showFill" class="px-3 py-2 text-right font-display text-[13px] font-medium" :class="r.fillRate != null && r.fillRate < 0.8 ? 'text-amber-600' : 'text-neutral-700'">
                        {{ r.fillRate != null ? `${Math.round(r.fillRate * 100)}%` : '—' }}
                      </td>
                      <td class="py-2 pl-3 text-right font-display text-[13px] font-medium text-neutral-700">{{ r.formattedCost ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="flex flex-col items-center py-8 text-center text-sm text-neutral-400">
                <MimuIcon name="dashboard" variant="sticker" :size="104" class="mb-2" />
                {{ $t('campaigns.perf.empty') }}
              </div>
            </template>
          </div>
        </Card>

        <!-- Offer -->
        <OfferCard :campaign-id="id" />

        <!-- B2B Leads — only shown when offer cta_type is b2b_inquiry -->
        <Card v-if="isB2b">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-body text-lg font-semibold text-neutral-900">
              Leads
              <span v-if="newLeadCount > 0" class="ml-2 inline-flex items-center rounded-full bg-clay-500 px-2 py-0.5 text-[11px] font-semibold text-white">{{ newLeadCount }} new</span>
            </h2>
            <span class="text-sm text-neutral-400">{{ leads.length }} total</span>
          </div>

          <div v-if="leads.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-line text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <tr>
                  <th class="py-2 pr-3 font-semibold">Business</th>
                  <th class="px-3 py-2 font-semibold">Contact</th>
                  <th class="hidden px-3 py-2 font-semibold sm:table-cell">Email</th>
                  <th class="px-3 py-2 font-semibold">Date</th>
                  <th class="py-2 pl-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="lead in leads"
                  :key="lead.id"
                  class="cursor-pointer border-b border-line last:border-0 hover:bg-surface-sunken"
                  :class="{ 'font-medium': lead.status === 'new' }"
                  @click="onLeadClick(lead)"
                >
                  <td class="py-2.5 pr-3 text-neutral-900">
                    <div class="flex items-center gap-1.5">
                      <PhEnvelope v-if="lead.status === 'new'" :size="13" class="shrink-0 text-clay-500" />
                      {{ lead.businessName }}
                    </div>
                  </td>
                  <td class="px-3 py-2.5 text-neutral-700">{{ lead.contactName }}</td>
                  <td class="hidden px-3 py-2.5 text-neutral-500 sm:table-cell">{{ lead.email }}</td>
                  <td class="px-3 py-2.5 text-neutral-500">{{ shortDate(lead.createdAt) }}</td>
                  <td class="py-2.5 pl-3">
                    <Badge
                      :tone="lead.status === 'new' ? 'accent' : lead.status === 'responded' ? 'success' : 'neutral'"
                      size="sm"
                      class="capitalize"
                    >{{ lead.status }}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="flex flex-col items-center py-8 text-center text-sm text-neutral-400">
            <MimuIcon name="dashboard" variant="sticker" :size="96" class="mb-2" />
            No leads yet — they'll appear here when someone scans your screen.
          </div>
        </Card>

        <!-- Outreach funnel — only shown for outreach-type campaigns -->
        <Card v-if="isOutreach && outreachStats">
          <h2 class="mb-4 font-body text-lg font-semibold text-neutral-900">Outreach Funnel</h2>
          <div class="grid grid-cols-4 gap-3">
            <div class="rounded-xl bg-clay-50 p-3 text-center">
              <p class="text-xl font-bold text-neutral-900">{{ (outreachStats as any)?.sent ?? 0 }}</p>
              <p class="eyebrow text-clay-500">Sent</p>
            </div>
            <div class="rounded-xl bg-clay-50 p-3 text-center">
              <p class="text-xl font-bold text-neutral-900">{{ (outreachStats as any)?.opened ?? 0 }}</p>
              <p class="eyebrow text-clay-500">Opened</p>
            </div>
            <div class="rounded-xl bg-clay-50 p-3 text-center">
              <p class="text-xl font-bold text-neutral-900">{{ (outreachStats as any)?.claimed ?? 0 }}</p>
              <p class="eyebrow text-clay-500">Claimed</p>
            </div>
            <div class="rounded-xl bg-clay-50 p-3 text-center">
              <p class="text-xl font-bold text-neutral-900">
                {{ (outreachStats as any)?.claimed && (outreachStats as any)?.sent
                    ? Math.round(((outreachStats as any).claimed / (outreachStats as any).sent) * 100)
                    : 0 }}%
              </p>
              <p class="eyebrow text-clay-500">Rate</p>
            </div>
          </div>
          <!-- Engagement: open/click from the outreach_sends log (click → page) -->
          <div v-if="outreachPerf?.delivery" class="mt-3 grid grid-cols-3 gap-3">
            <div class="rounded-xl border border-line p-3 text-center">
              <p class="text-lg font-bold text-neutral-900">{{ (outreachPerf.delivery.totalClicked ?? 0).toLocaleString('en-NG') }}</p>
              <p class="eyebrow text-neutral-500">Clicked</p>
            </div>
            <div class="rounded-xl border border-line p-3 text-center">
              <p class="text-lg font-bold text-neutral-900">{{ Math.round((outreachPerf.delivery.clickRate ?? 0) * 100) }}%</p>
              <p class="eyebrow text-neutral-500">Click rate</p>
            </div>
            <div class="rounded-xl border border-line p-3 text-center">
              <p class="text-lg font-bold text-neutral-900">₦{{ (outreachPerf.delivery.costPerSendNaira ?? 0).toLocaleString('en-NG') }}</p>
              <p class="eyebrow text-neutral-500">Cost / send</p>
            </div>
          </div>
        </Card>

        <!-- Field Campaign — people-powered referral layer for screen campaigns -->
        <Card v-if="isScreen">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-body text-lg font-semibold text-neutral-900">Field Campaign</h2>
            <Button v-if="!fieldCampaign" size="sm" @click="showFieldCreate = !showFieldCreate">
              Launch
            </Button>
          </div>

          <!-- Create form -->
          <div v-if="showFieldCreate && !fieldCampaign" class="mb-4 space-y-3 rounded-xl bg-clay-50 p-4">
            <div>
              <label class="eyebrow mb-1 block">Campaign name</label>
              <input v-model="fieldCreateForm.name" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm" placeholder="e.g. Market Activation Q1" />
            </div>
            <div>
              <label class="eyebrow mb-1 block">Budget pool (₦)</label>
              <input v-model="fieldCreateForm.budgetPool" type="number" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm" placeholder="50000" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="eyebrow mb-1 block">Start</label>
                <input v-model="fieldCreateForm.startDate" type="date" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="eyebrow mb-1 block">End</label>
                <input v-model="fieldCreateForm.endDate" type="date" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm" />
              </div>
            </div>
            <Button size="sm" @click="onCreateField">Create field campaign</Button>
          </div>

          <div v-if="!fieldCampaign && !showFieldCreate" class="text-sm text-neutral-400">
            Amplify this campaign with a network of community scouts who earn per verified referral.
          </div>

          <!-- Field campaign stats -->
          <div v-if="fieldCampaign" class="space-y-4">
            <!-- Sub-tabs: Overview / Tasks -->
            <div class="flex gap-1 rounded-lg border border-line bg-surface-sunken p-0.5">
              <button
                class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="fieldTab === 'overview' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'"
                @click="fieldTab = 'overview'"
              >Overview</button>
              <button
                class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="fieldTab === 'tasks' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'"
                @click="fieldTab = 'tasks'"
              >Tasks</button>
            </div>

            <!-- Overview tab -->
            <template v-if="fieldTab === 'overview'">
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-xl bg-clay-50 p-3 text-center">
                  <p class="text-2xl font-bold text-neutral-900">{{ fieldCampaign.scoutCount ?? 0 }}</p>
                  <p class="eyebrow text-clay-500">Scouts</p>
                </div>
                <div class="rounded-xl bg-clay-50 p-3 text-center">
                  <p class="text-2xl font-bold text-neutral-900">{{ fieldCampaign.totalClaims ?? 0 }}</p>
                  <p class="eyebrow text-clay-500">Claims</p>
                </div>
                <div class="rounded-xl bg-clay-50 p-3 text-center">
                  <p class="text-sm font-bold text-neutral-900">
                    ₦{{ (parseInt(fieldCampaign.poolRemainingKobo) / 100).toLocaleString('en-NG') }}
                  </p>
                  <p class="eyebrow text-clay-500">Pool left</p>
                </div>
              </div>

              <!-- Scout economics: redemptions actually convert claims → sales -->
              <div v-if="fieldPerf?.scouts" class="grid grid-cols-3 gap-3">
                <div class="rounded-xl border border-line p-3 text-center">
                  <p class="text-lg font-bold text-neutral-900">{{ (fieldPerf.scouts.totalRedemptions ?? 0).toLocaleString('en-NG') }}</p>
                  <p class="eyebrow text-neutral-500">Redeemed</p>
                </div>
                <div class="rounded-xl border border-line p-3 text-center">
                  <p class="text-lg font-bold text-neutral-900">{{ Math.round((fieldPerf.scouts.redemptionRate ?? 0) * 100) }}%</p>
                  <p class="eyebrow text-neutral-500">Redeem rate</p>
                </div>
                <div class="rounded-xl border border-line p-3 text-center">
                  <p class="text-lg font-bold text-neutral-900">₦{{ (fieldPerf.scouts.totalEarnedNaira ?? 0).toLocaleString('en-NG') }}</p>
                  <p class="eyebrow text-neutral-500">Paid out</p>
                </div>
              </div>

              <!-- Spread map -->
              <div>
                <p class="eyebrow mb-2 text-neutral-500">Scout spread</p>
                <SpreadMap :points="heatmapPoints" height="300px" />
              </div>

              <!-- Top scouts: earnings leaderboard when available, else claims -->
              <div v-if="scoutLeaderboard.length">
                <p class="eyebrow mb-2 text-neutral-500">Scout leaderboard · by earnings</p>
                <div class="space-y-2">
                  <div v-for="s in scoutLeaderboard.slice(0, 5)" :key="s.scoutId" class="flex items-center justify-between rounded-lg bg-clay-50 px-3 py-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-clay-400 w-4">#{{ s.rank }}</span>
                      <span class="text-sm font-medium text-neutral-800">{{ s.scoutName }}</span>
                      <span class="text-xs text-neutral-400">{{ s.referrals }} ref · {{ s.redemptions }} redeemed</span>
                    </div>
                    <span class="text-sm font-medium text-neutral-700">₦{{ s.earnedNaira.toLocaleString('en-NG') }}</span>
                  </div>
                </div>
              </div>
              <div v-else-if="topScouts.length">
                <p class="eyebrow mb-2 text-neutral-500">Top scouts</p>
                <div class="space-y-2">
                  <div v-for="(scout, i) in topScouts.slice(0, 5)" :key="scout.id" class="flex items-center justify-between rounded-lg bg-clay-50 px-3 py-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-clay-400 w-4">#{{ i + 1 }}</span>
                      <span class="text-sm font-medium text-neutral-800">{{ scout.displayName }}</span>
                      <code class="text-xs text-clay-500">{{ scout.referralCode }}</code>
                    </div>
                    <span class="text-sm font-medium text-neutral-700">{{ scout.activitiesCount ?? 0 }} claims</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Tasks tab -->
            <FieldCampaignTasksTab v-else-if="fieldTab === 'tasks'" :campaign-id="id" />
          </div>
        </Card>

        <!-- Decision factors -->
        <Card>
          <h2 class="mb-4 font-body text-lg font-semibold text-neutral-900">{{ $t('campaigns.decisionFactors') }}</h2>
          <div v-if="factorList.length" class="space-y-3">
            <div v-for="(f, i) in factorList" :key="i">
              <div class="mb-1 flex justify-between text-xs">
                <span class="font-medium text-neutral-600">{{ f.label ?? f.name }}</span>
                <span class="font-display text-neutral-400">{{ Math.round((f.weight ?? f.value ?? 0) * 100) }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div class="h-full rounded-full bg-moss-400" :style="{ width: Math.round((f.weight ?? f.value ?? 0) * 100) + '%' }" />
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-neutral-400">{{ $t('common.comingSoon') }}</p>
        </Card>
      </div>

      <!-- ── SIDEBAR ──────────────────────────────────────────── -->
      <aside class="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <!-- Creative preview -->
        <Card padding="none" class="overflow-hidden">
          <div class="relative aspect-video bg-black">
            <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
            <video
              v-else-if="c.previewUrl && creativeFmt === 'video'"
              :src="`${c.previewUrl}#t=1`"
              muted
              playsinline
              preload="metadata"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-neutral-600"><PhFilmSlate :size="30" /></div>
            <span
              v-if="creativeFmt"
              class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm"
            >
              <PhStack v-if="creativeFmt === 'carousel'" :size="12" weight="fill" />
              <PhVideoCamera v-else-if="creativeFmt === 'video'" :size="12" weight="fill" />
              <PhImage v-else :size="12" weight="fill" />
              {{ creativeFmt }}
            </span>
          </div>
          <!-- Carousel frame strip -->
          <div v-if="creativeFmt === 'carousel' && carouselPreviewItems.length" class="flex gap-1.5 overflow-x-auto px-3 py-2">
            <div
              v-for="(item, i) in carouselPreviewItems"
              :key="item.id"
              class="relative shrink-0 w-20 rounded overflow-hidden border border-neutral-200"
            >
              <img
                v-if="item.format === 'image' && item.cdnUrl"
                :src="item.cdnUrl"
                :alt="`Frame ${i + 1}`"
                class="w-full aspect-video object-cover"
              />
              <div v-else class="w-full aspect-video bg-neutral-100 flex items-center justify-center">
                <PhVideoCamera :size="14" class="text-neutral-400" />
              </div>
              <span class="absolute bottom-0.5 right-0.5 text-[9px] font-medium bg-black/60 text-white rounded px-0.5">{{ item.dwellSeconds }}s</span>
              <span class="absolute top-0.5 left-0.5 text-[9px] font-bold bg-black/60 text-white rounded px-0.5">{{ i + 1 }}</span>
            </div>
          </div>
          <div v-if="c.creativeLabel" class="truncate px-3 py-2 text-xs text-neutral-500">{{ c.creativeLabel }}</div>
        </Card>

        <!-- Actions -->
        <Card v-if="session.canMutate">
          <div class="grid grid-cols-2 gap-2">
            <Button v-if="c.status === 'active'" size="sm" variant="secondary" class="col-span-2" @click="run(() => pauseCampaign(id))">{{ $t('campaigns.pause') }}</Button>
            <Button v-if="c.status === 'paused'" size="sm" variant="secondary" class="col-span-2" @click="run(() => resumeCampaign(id))">{{ $t('campaigns.resume') }}</Button>
            <Button size="sm" variant="secondary" @click="onTopup">{{ $t('campaigns.topup') }}</Button>
            <Button size="sm" variant="secondary" @click="onExtend">{{ $t('campaigns.extend') }}</Button>
            <Button size="sm" variant="outline" class="col-span-2" @click="onClone">{{ $t('campaigns.clone') }}</Button>
          </div>
        </Card>

        <!-- Pacing -->
        <Card>
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium text-neutral-700">{{ $t('campaigns.pacing') }}</span>
            <span class="font-display text-xs font-medium text-neutral-500">{{ pacing }}%</span>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div class="h-full rounded-full bg-clay-500 transition-all" :style="{ width: pacing + '%' }" />
          </div>
          <div class="mt-2.5 flex items-center justify-between gap-2 text-xs">
            <span class="font-display text-[13px] font-medium text-neutral-500">{{ formatKobo(c.spentKobo) }}<span class="text-neutral-300"> / </span>{{ formatKobo(c.budgetKobo) }}</span>
            <Badge :tone="pacingTone" size="sm" class="capitalize">{{ (overall?.pacing?.status ?? 'on track').replace(/_/g, ' ') }}</Badge>
          </div>
          <div v-if="overall?.pacing?.formattedExpectedSpend" class="mt-2 flex justify-between text-xs">
            <span class="text-neutral-500">{{ $t('campaigns.perf.expectedSpend') }}</span>
            <span class="font-display text-[13px] font-medium text-neutral-700">{{ overall.pacing.formattedExpectedSpend }}</span>
          </div>
        </Card>

        <!-- Details -->
        <Card>
          <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('campaigns.detailsTitle') }}</p>
          <dl class="space-y-2.5 text-sm">
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.status') }}</dt><dd><Badge :tone="statusTone(c.status)" size="sm">{{ statusLabel(c.status) }}</Badge></dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.objective') }}</dt><dd class="capitalize text-neutral-900">{{ c.objective }}</dd></div>
            <div v-if="creativeFmt" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.format') }}</dt><dd class="capitalize text-neutral-900">{{ creativeFmt }}</dd></div>
            <div v-if="c.screenCount != null" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('nav.screens') }}</dt><dd class="font-display text-[13px] font-medium text-neutral-900">{{ c.screenCount.toLocaleString('en-NG') }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.starts') }}</dt><dd class="text-neutral-900">{{ shortDate(c.startDate) }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.ends') }}</dt><dd class="text-neutral-900">{{ shortDate(c.endDate) }}</dd></div>
            <div v-if="daysLeft != null" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.daysRemaining') }}</dt><dd class="font-display text-[13px] font-medium text-neutral-900">{{ daysLeft }}</dd></div>
            <div v-if="c.formattedBidCpm" class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.cpmRate') }}</dt><dd class="font-display text-[13px] font-medium text-neutral-900">{{ c.formattedBidCpm }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.created') }}</dt><dd class="text-neutral-900">{{ shortDate(c.createdAt) }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-neutral-500">{{ $t('campaigns.perf.lastPlay') }}</dt><dd class="text-neutral-900">{{ overall?.timeline?.lastPlayAt ? shortDate(overall.timeline.lastPlayAt) : $t('campaigns.perf.never') }}</dd></div>
          </dl>
        </Card>
      </aside>
    </div>
  </div>
</template>
