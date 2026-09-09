<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import CreativePreview from '@/components/CreativePreview.vue'
import CarouselSequencePreview from '@/components/CarouselSequencePreview.vue'
import ScreenPicker from '@/components/screens/ScreenPicker.vue'
import WizardShell from '@/components/wizard/WizardShell.vue'
import PhaseRail from '@/components/wizard/PhaseRail.vue'
import ObjectiveCard from '@/components/wizard/ObjectiveCard.vue'
import EstimatePanel from '@/components/wizard/EstimatePanel.vue'
import HealthPanel from '@/components/wizard/HealthPanel.vue'
import { useWizard } from '@/stores/wizard'
import { useBasket } from '@/stores/basket'
import { useSession } from '@/stores/session'
import { useKyc } from '@/composables/useKyc'
import { WIZARD_PHASES, phaseValid, stepValid, buildCreatePayload } from '@/lib/wizard'
import { evaluateHealth } from '@/lib/campaignHealth'
import { ObjectiveSchema } from '@/api/contracts/campaigns'
import { getQuote, createCampaign, submitCampaign } from '@/api/campaigns'
import { getWallet } from '@/api/billing'
import {
  listCreatives,
  uploadIntent,
  putToPresigned,
  putBlobToPresigned,
  capturePosterFrame,
  confirmUpload,
  sha256Hex,
  probeCreative,
} from '@/api/creatives'
import { createCarousel, uploadCarouselFrame, deleteCarouselItem, reorderCarousel, confirmCarousel } from '@/api/carousel'
import { CAROUSEL_MAX_ITEMS, CAROUSEL_MAX_TOTAL_SECONDS, carouselTotalSeconds } from '@/lib/wizard'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const wizard = useWizard()
const basket = useBasket()
const session = useSession()
const qc = useQueryClient()
const toast = useToastStore()
const { t } = useI18n()
const s = wizard.state

// Start the creative step blank on every fresh entry: the in-memory wizard
// store can survive navigation, so a returning draft could otherwise re-show a
// previously attached ad. Clearing on mount forces an upload this session.
onMounted(() => { s.creativeId = '' })

// Schedule window: campaigns can't exceed 90 days (backend cap). Start no
// earlier than tomorrow; picking a start seeds a 13-day flight and clamps any
// end date into the [start, start+90d] window (mirrors the mobile app).
function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
const minStart = computed(() => isoDay(Date.now() + 86_400_000))
const maxEnd = computed(() => (s.startDate ? isoDay(Date.parse(s.startDate) + 90 * 86_400_000) : ''))
watch(
  () => s.startDate,
  (start) => {
    if (!start) return
    const startMs = Date.parse(start)
    if (!s.endDate || s.endDate <= start) s.endDate = isoDay(startMs + 13 * 86_400_000)
    const max = isoDay(startMs + 90 * 86_400_000)
    if (s.endDate > max) s.endDate = max
  },
)

// Deep-link safety: campaign creation requires identity verification.
const { kycComplete, isLoading: kycLoading } = useKyc()
watch([kycLoading, kycComplete], ([loading, complete]) => {
  if (!loading && !complete) router.replace('/verify')
}, { immediate: true })

const objectives = ObjectiveSchema.options
const days = [0, 1, 2, 3, 4, 5, 6]
const hours = Array.from({ length: 24 }, (_, h) => h)

// ── Phase navigation (X's 4-phase rail over the 6 sub-steps) ──────────
const PHASES = WIZARD_PHASES
const phase = ref(0)
const currentPhase = computed(() => PHASES[phase.value]!)
const canAdvance = computed(() => phaseValid(s, currentPhase.value))
// Furthest phase the user can jump to (all preceding phases valid).
const maxReachable = computed(() => {
  let i = 0
  while (i < PHASES.length - 1 && phaseValid(s, PHASES[i]!)) i++
  return i
})
const railPhases = computed(() => PHASES.map((k) => ({ key: k, label: k })))

function toggleIn(arr: number[], v: number) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}
function useBasketScreens() {
  s.isWildcard = false
  s.screenIds = [...basket.ids]
}

// ── Live quote (drives the Estimate rail) ────────────────────────────
const scheduleReady = computed(() => stepValid(s, 'schedule'))
const targetReady = computed(() => s.isWildcard || s.screenIds.length > 0)
const quoteReady = computed(() => scheduleReady.value && targetReady.value)

// Debounce the quote inputs so rapid changes (picking screens, nudging dates)
// coalesce into ONE request instead of firing on every click. Dayparts/days are
// intentionally excluded — they refine pacing, not the headline estimate, and
// leaving them out avoids a request (and the single-value query error) on every
// hour/day toggle.
const quoteSig = computed(() =>
  JSON.stringify({ w: s.isWildcard, ids: s.screenIds, sd: s.startDate, ed: s.endDate }),
)
const debouncedSig = ref(quoteSig.value)
let quoteTimer: ReturnType<typeof setTimeout> | undefined
watch(quoteSig, (v) => {
  clearTimeout(quoteTimer)
  quoteTimer = setTimeout(() => (debouncedSig.value = v), 500)
})

const { data: quote, isFetching: quoteLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'quote', debouncedSig.value)),
  enabled: quoteReady,
  queryFn: () =>
    getQuote({
      isWildcard: s.isWildcard,
      screenIds: s.isWildcard ? undefined : s.screenIds,
      startDate: new Date(`${s.startDate}T00:00:00Z`).toISOString(),
      endDate: new Date(`${s.endDate}T00:00:00Z`).toISOString(),
    }),
})

// Wallet — only needed so the health panel can warn "top up before launch".
const { data: wallet } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'wallet')),
  queryFn: getWallet,
})

// Narrow↔Broad breadth: how wide the targeting is (screens vs inventory,
// narrowed by daypart / day-of-week limits).
const breadth = computed(() => {
  const total = quote.value?.totalScreens
  const base = s.isWildcard
    ? 1
    : total
      ? Math.min(1, s.screenIds.length / Math.max(total, 1))
      : Math.min(1, s.screenIds.length / 20)
  const dayN = s.daysOfWeek.length ? s.daysOfWeek.length / 7 : 1
  const hourN = s.hours.length ? s.hours.length / 24 : 1
  return Math.max(0.03, Math.min(1, base * dayN * hourN))
})

const health = computed(() =>
  evaluateHealth(s, { quote: quote.value ?? null, walletBalanceKobo: wallet.value?.balanceKobo ?? null }),
)

// ── Creatives ────────────────────────────────────────────────────────
const { data: creatives, refetch: refetchCreatives } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'creatives')),
  queryFn: listCreatives,
})
const selectedCreative = computed(
  () => creatives.value?.creatives.find((c) => c.id === s.creativeId) ?? null,
)
const uploading = ref(false)
async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const isVideo = file.type.startsWith('video')
  uploading.value = true
  try {
    // Videos must ship duration (+ resolution) — the backend rejects video
    // uploads without it (5–180s, landscape). Probe the file client-side and
    // surface friendly errors before hitting the API.
    const meta = await probeCreative(file)
    if (isVideo) {
      if (!meta.durationSeconds) {
        toast.error(t('campaigns.creativeReadFailed'))
        return
      }
      if (meta.durationSeconds < 5 || meta.durationSeconds > 180) {
        toast.error(t('campaigns.creativeVideoDuration'))
        return
      }
      if (meta.resolution) {
        const [w, h] = meta.resolution.split('x').map(Number)
        if (h && w && h > w) {
          toast.error(t('campaigns.creativeVideoPortrait'))
          return
        }
      }
    }
    const intent = await uploadIntent({
      filename: file.name,
      format: isVideo ? 'video' : 'image',
      sizeBytes: file.size,
      durationSeconds: meta.durationSeconds,
      resolution: meta.resolution,
    })
    await putToPresigned(intent.presignedUrl, file)
    // Give video creatives a real cover: derive a poster frame (~1s) and upload
    // it to the companion slot BEFORE confirm — the backend clears posterS3Key
    // if the poster object is missing at confirm time. Best-effort: a capture or
    // upload failure just falls back to the null-poster placeholder.
    if (isVideo && intent.posterUpload?.presignedUrl) {
      try {
        const poster = await capturePosterFrame(file, 1)
        if (poster) await putBlobToPresigned(intent.posterUpload.presignedUrl, poster, 'image/jpeg')
      } catch {
        /* non-fatal — creative still uploads without a poster */
      }
    }
    await confirmUpload(intent.creativeId, await sha256Hex(file))
    await refetchCreatives()
    s.creativeId = intent.creativeId
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Upload failed')
  } finally {
    uploading.value = false
    input.value = '' // allow re-selecting the same file after an error
  }
}

// ── Carousel authoring ────────────────────────────────────────────────
const DEFAULT_FRAME_SECONDS = 6
const carouselTotal = computed(() => carouselTotalSeconds(s.carouselItems))
const carouselRemaining = computed(() => CAROUSEL_MAX_TOTAL_SECONDS - carouselTotal.value)

function switchCreativeMode(mode: 'single' | 'carousel') {
  if (s.creativeMode === mode) return
  s.creativeMode = mode
  // Switching modes invalidates the other mode's confirmed selection.
  if (mode === 'carousel') s.creativeId = ''
  else s.carouselConfirmed = false
}

/** Lazily create the backend carousel the first time a frame is added. */
async function ensureCarousel(): Promise<string> {
  if (s.carouselId) return s.carouselId
  const { carouselId } = await createCarousel(s.name || undefined)
  s.carouselId = carouselId
  return carouselId
}

async function onAddCarouselFrames(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return
  uploading.value = true
  try {
    const carouselId = await ensureCarousel()
    for (const file of files) {
      if (s.carouselItems.length >= CAROUSEL_MAX_ITEMS) {
        toast.error(`A carousel can hold at most ${CAROUSEL_MAX_ITEMS} frames.`)
        break
      }
      // Default each new frame to DEFAULT_FRAME_SECONDS, but never overshoot 30s.
      const dwell = Math.min(DEFAULT_FRAME_SECONDS, Math.max(3, carouselRemaining.value))
      if (dwell < 3) {
        toast.error('Carousel is full (30s). Trim a frame to add more.')
        break
      }
      const frame = await uploadCarouselFrame(carouselId, file, dwell)
      s.carouselItems.push({
        itemId: frame.itemId,
        format: frame.format,
        filename: frame.filename,
        dwellSeconds: dwell,
        // Local object-URL for thumbnail + sequence preview (session only).
        previewUrl: URL.createObjectURL(file),
      })
      // Editing frames invalidates a prior finalize.
      s.carouselConfirmed = false
    }
  } catch (err) {
    toast.error(isApiError(err) ? err.message : 'Frame upload failed')
  } finally {
    uploading.value = false
  }
}

async function removeCarouselFrame(itemId: string) {
  if (!s.carouselId) return
  try {
    await deleteCarouselItem(s.carouselId, itemId)
    s.carouselItems = s.carouselItems.filter((i) => i.itemId !== itemId)
    s.carouselConfirmed = false
  } catch (err) {
    toast.error(isApiError(err) ? err.message : 'Could not remove frame')
  }
}

async function moveCarouselFrame(index: number, dir: -1 | 1) {
  const to = index + dir
  if (!s.carouselId || to < 0 || to >= s.carouselItems.length) return
  const items = [...s.carouselItems]
  const moved = items.splice(index, 1)[0]
  if (!moved) return
  items.splice(to, 0, moved)
  s.carouselItems = items
  s.carouselConfirmed = false
  try {
    await reorderCarousel(s.carouselId, items.map((i) => i.itemId))
  } catch (err) {
    toast.error(isApiError(err) ? err.message : 'Reorder failed')
  }
}

function setFrameDwell(itemId: string, seconds: number) {
  const item = s.carouselItems.find((i) => i.itemId === itemId)
  if (!item) return
  item.dwellSeconds = Math.max(3, Math.min(30, Math.round(seconds) || 3))
  s.carouselConfirmed = false
}

async function finalizeCarousel() {
  if (!s.carouselId) return
  uploading.value = true
  try {
    await confirmCarousel(s.carouselId)
    s.carouselConfirmed = true
    toast.success('Carousel saved.')
  } catch (err) {
    toast.error(isApiError(err) ? err.message : 'Could not finalize carousel')
  } finally {
    uploading.value = false
  }
}

const submitting = ref(false)
async function finish(submit: boolean) {
  submitting.value = true
  try {
    const campaign = await createCampaign(buildCreatePayload(s))
    if (submit) await submitCampaign(campaign.id)
    wizard.reset()
    // Refresh the campaigns list/dashboard so the new campaign (and the updated
    // KPI strip) appear immediately instead of waiting out the staleTime.
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'campaigns') })
    router.push(`/campaigns/${campaign.id}`)
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Something went wrong')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="page-title">{{ $t('campaigns.newCampaign') }}</h1>
        <p class="page-subtitle mt-0.5">{{ $t('wizard.timeHint') }}</p>
      </div>
      <Button variant="ghost" size="sm" @click="router.push('/campaigns')">{{ $t('common.cancel') }}</Button>
    </div>

    <WizardShell>
      <!-- Left: phase rail -->
      <template #rail>
        <PhaseRail
          :phases="railPhases.map((p) => ({ key: p.key, label: $t('wizard.phases.' + p.key) }))"
          :active="phase"
          :max-reached="maxReachable"
          @go="phase = $event"
        />
      </template>

      <!-- Center: step form -->
      <div class="rounded-xl border border-line bg-surface p-6 shadow-card">
        <!-- Phase 1 · Objective -->
        <div v-if="currentPhase === 'objective'" class="space-y-5">
          <div class="rounded-xl border border-line bg-surface p-4">
            <p class="font-display text-lg font-semibold text-neutral-900">{{ $t('wizard.welcomeTitle') }}</p>
            <p class="mt-1 text-sm text-neutral-500">{{ $t('wizard.welcomeBody') }}</p>
          </div>

          <label class="block">
            <span class="label">{{ $t('campaigns.name') }}</span>
            <input v-model="s.name" minlength="3" class="input" :placeholder="$t('wizard.namePlaceholder')" />
          </label>

          <div>
            <p class="label">{{ $t('wizard.objective.prompt') }}</p>
            <p class="mb-3 text-sm text-neutral-500">{{ $t('wizard.objective.promptBody') }}</p>
            <div class="space-y-2.5">
              <ObjectiveCard
                v-for="o in objectives"
                :key="o"
                :title="$t('campaigns.objectives.' + o)"
                :hint="$t('campaigns.objectives.' + o + 'Hint')"
                :how-it-works="$t('wizard.objective.' + o + '.how')"
                :good-for="$t('wizard.objective.' + o + '.good')"
                :how-it-works-label="$t('wizard.objective.howItWorks')"
                :good-for-label="$t('wizard.objective.goodFor')"
                :selected="s.objective === o"
                @click="s.objective = o"
              />
            </div>
          </div>
        </div>

        <!-- Phase 2 · Audience -->
        <div v-else-if="currentPhase === 'audience'" class="space-y-6">
          <!-- Screens -->
          <section class="space-y-3">
            <div>
              <p class="font-display text-base font-semibold text-neutral-900">{{ $t('wizard.audience.screens') }}</p>
              <p class="text-sm text-neutral-500">{{ $t('wizard.audience.body') }}</p>
            </div>
            <label
              class="flex cursor-pointer items-center gap-2 rounded-xl border p-3.5"
              :class="s.isWildcard ? 'border-clay-500 bg-clay-500/10' : 'border-line-strong'"
            >
              <input v-model="s.isWildcard" type="checkbox" class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400" />
              <span>
                <span class="block font-medium text-neutral-900">{{ $t('campaigns.wildcard') }}</span>
                <span class="block text-sm text-neutral-500">{{ $t('campaigns.wildcardHint') }}</span>
              </span>
            </label>
            <div v-if="!s.isWildcard" class="space-y-3">
              <div v-if="basket.count" class="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2">
                <span class="text-sm text-neutral-500">{{ $t('campaigns.basketAvailable', { count: basket.count }) }}</span>
                <Button variant="secondary" size="sm" @click="useBasketScreens">{{ $t('campaigns.useBasket', { count: basket.count }) }}</Button>
              </div>
              <ScreenPicker v-model="s.screenIds" />
            </div>
          </section>

          <!-- Schedule -->
          <section class="space-y-4 border-t border-line pt-5">
            <p class="font-display text-base font-semibold text-neutral-900">{{ $t('wizard.audience.schedule') }}</p>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="label">{{ $t('campaigns.startDate') }}</span>
                <input v-model="s.startDate" type="date" class="input" :min="minStart" /></label>
              <label class="block"><span class="label">{{ $t('campaigns.endDate') }}</span>
                <input v-model="s.endDate" type="date" class="input" :min="s.startDate || minStart" :max="maxEnd" :disabled="!s.startDate" /></label>
            </div>
            <p class="-mt-2 text-xs text-neutral-400">{{ $t('campaigns.maxDurationHint') }}</p>
            <div>
              <p class="label">{{ $t('campaigns.daysOfWeek') }}</p>
              <div class="flex flex-wrap gap-1">
                <button v-for="d in days" :key="d" type="button" class="h-8 w-10 rounded text-xs"
                  :class="s.daysOfWeek.includes(d) ? 'bg-clay-500 text-white' : 'bg-neutral-100 text-neutral-600'"
                  @click="toggleIn(s.daysOfWeek, d)">{{ ['Su','Mo','Tu','We','Th','Fr','Sa'][d] }}</button>
              </div>
              <p v-if="!s.daysOfWeek.length" class="mt-1 text-xs text-neutral-400">{{ $t('campaigns.allDays') }}</p>
            </div>
            <div>
              <p class="label">{{ $t('campaigns.dayparts') }}</p>
              <div class="grid grid-cols-12 gap-1">
                <button v-for="h in hours" :key="h" type="button" class="h-6 rounded text-[10px]"
                  :class="s.hours.includes(h) ? 'bg-clay-500 text-white' : 'bg-neutral-100 text-neutral-500'"
                  @click="toggleIn(s.hours, h)">{{ h }}</button>
              </div>
              <p v-if="!s.hours.length" class="mt-1 text-xs text-neutral-400">{{ $t('campaigns.allHours') }}</p>
            </div>
          </section>

          <!-- Budget & delivery -->
          <section class="space-y-4 border-t border-line pt-5">
            <p class="font-display text-base font-semibold text-neutral-900">{{ $t('wizard.audience.budget') }}</p>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="label">{{ $t('campaigns.totalBudget') }}</span>
                <input v-model.number="s.budgetNaira" type="number" min="1" class="input" placeholder="50000" /></label>
              <label class="block"><span class="label">{{ $t('campaigns.dailyCap') }}</span>
                <input v-model.number="s.dailyCapNaira" type="number" min="1" class="input" /></label>
            </div>
            <div>
              <p class="label">{{ $t('wizard.audience.pacing') }}</p>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" class="rounded-xl border p-3 text-left transition-colors"
                  :class="!s.isEvenPacing ? 'border-clay-500 bg-clay-500/10' : 'border-line-strong hover:bg-neutral-50'"
                  @click="s.isEvenPacing = false">
                  <p class="text-sm font-semibold text-neutral-900">{{ $t('wizard.audience.pacingStandard') }}</p>
                  <p class="text-xs text-neutral-500">{{ $t('wizard.audience.pacingStandardHint') }}</p>
                </button>
                <button type="button" class="rounded-xl border p-3 text-left transition-colors"
                  :class="s.isEvenPacing ? 'border-clay-500 bg-clay-500/10' : 'border-line-strong hover:bg-neutral-50'"
                  @click="s.isEvenPacing = true">
                  <p class="text-sm font-semibold text-neutral-900">{{ $t('wizard.audience.pacingEven') }}</p>
                  <p class="text-xs text-neutral-500">{{ $t('wizard.audience.pacingEvenHint') }}</p>
                </button>
              </div>
            </div>
          </section>
        </div>

        <!-- Phase 3 · Creative -->
        <div v-else-if="currentPhase === 'creative'" class="space-y-4">
          <div>
            <p class="font-display text-base font-semibold text-neutral-900">{{ $t('wizard.creative.title') }}</p>
            <p class="text-sm text-neutral-500">{{ $t('wizard.creative.body') }}</p>
          </div>

          <!-- Single ad vs carousel toggle -->
          <div class="inline-flex rounded-lg border border-neutral-200 p-0.5 text-sm">
            <button type="button"
              class="rounded-md px-3 py-1.5"
              :class="s.creativeMode === 'single' ? 'bg-clay-500 text-white' : 'text-neutral-600'"
              @click="switchCreativeMode('single')">Single ad</button>
            <button type="button"
              class="rounded-md px-3 py-1.5"
              :class="s.creativeMode === 'carousel' ? 'bg-clay-500 text-white' : 'text-neutral-600'"
              @click="switchCreativeMode('carousel')">Carousel</button>
          </div>

          <!-- SINGLE -->
          <template v-if="s.creativeMode === 'single'">
            <p class="rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800">{{ $t('campaigns.creativePending') }}</p>
            <div v-if="selectedCreative"
              class="flex items-center gap-3 rounded-lg border border-clay-500 bg-clay-500/10 p-3">
              <span class="text-sm text-neutral-900">{{ selectedCreative.name || selectedCreative.filename }}</span>
              <span class="ml-auto text-xs capitalize text-neutral-500">{{ selectedCreative.status.replace(/_/g, ' ') }}</span>
            </div>
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-clay-600">
              <input type="file" accept="image/*,video/mp4" class="hidden" @change="onUpload" />
              <span class="hover:underline">{{ uploading ? $t('common.loading') : (selectedCreative ? $t('campaigns.replaceCreative') : $t('campaigns.uploadCreative')) }}</span>
            </label>
            <div v-if="selectedCreative" class="pt-1">
              <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ $t('campaigns.creativePreview') }}</p>
              <CreativePreview :format="selectedCreative.format" :src="selectedCreative.previewUrl ?? selectedCreative.cdnUrl" :poster="selectedCreative.posterUrl" />
            </div>
          </template>

          <!-- CAROUSEL -->
          <template v-else>
            <p class="text-sm text-neutral-500">A group of graphics/short clips shown in sequence in one slot (max 30s). Portrait graphics fill the screen with a blurred background — no black bars.</p>

            <!-- Live sequence preview (cycles frames at their set seconds). -->
            <div v-if="s.carouselItems.length" class="space-y-1.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Preview — as it plays on screen</p>
              <CarouselSequencePreview :items="s.carouselItems" />
            </div>

            <!-- Frame cards -->
            <ul v-if="s.carouselItems.length" class="space-y-2">
              <li v-for="(item, i) in s.carouselItems" :key="item.itemId"
                class="flex items-center gap-3 rounded-lg border border-neutral-200 p-2">
                <div class="relative h-12 w-[72px] shrink-0 overflow-hidden rounded bg-black">
                  <video v-if="item.format === 'video' && item.previewUrl" :src="item.previewUrl" muted
                    class="h-full w-full object-contain" />
                  <img v-else-if="item.previewUrl" :src="item.previewUrl" alt=""
                    class="h-full w-full object-contain" />
                  <span class="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{{ i + 1 }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-neutral-900">{{ item.filename }}</p>
                  <span class="text-xs capitalize text-neutral-400">{{ item.format }}</span>
                </div>
                <label class="flex items-center gap-1 text-xs text-neutral-500">
                  <input type="number" min="3" max="30" :value="item.dwellSeconds"
                    class="w-14 rounded border border-neutral-200 px-1.5 py-1 text-right text-sm"
                    @change="setFrameDwell(item.itemId, ($event.target as HTMLInputElement).valueAsNumber)" />
                  s
                </label>
                <div class="flex flex-col">
                  <button type="button" class="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" :disabled="i === 0" @click="moveCarouselFrame(i, -1)">▲</button>
                  <button type="button" class="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" :disabled="i === s.carouselItems.length - 1" @click="moveCarouselFrame(i, 1)">▼</button>
                </div>
                <button type="button" class="px-1 text-neutral-400 hover:text-red-600" @click="removeCarouselFrame(item.itemId)">✕</button>
              </li>
            </ul>

            <!-- Total meter -->
            <div class="flex items-center gap-3 text-sm"
              :class="carouselTotal > CAROUSEL_MAX_TOTAL_SECONDS ? 'text-red-600' : 'text-neutral-500'">
              <span>{{ carouselTotal }}s of {{ CAROUSEL_MAX_TOTAL_SECONDS }}s</span>
              <span class="text-neutral-300">·</span>
              <span>{{ s.carouselItems.length }} / {{ CAROUSEL_MAX_ITEMS }} frames</span>
            </div>

            <label v-if="s.carouselItems.length < CAROUSEL_MAX_ITEMS"
              class="inline-flex cursor-pointer items-center gap-2 text-sm text-clay-600">
              <input type="file" accept="image/*,video/mp4" multiple class="hidden" @change="onAddCarouselFrames" />
              <span class="hover:underline">{{ uploading ? $t('common.loading') : (s.carouselItems.length ? 'Add another frame' : 'Add frames') }}</span>
            </label>

            <div class="pt-1">
              <button type="button"
                class="rounded-lg bg-clay-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                :disabled="uploading || s.carouselConfirmed || s.carouselItems.length < 2 || carouselTotal > CAROUSEL_MAX_TOTAL_SECONDS"
                @click="finalizeCarousel">
                {{ s.carouselConfirmed ? 'Carousel saved ✓' : 'Save carousel' }}
              </button>
            </div>
          </template>
        </div>

        <!-- Phase 4 · Launch (review) -->
        <div v-else class="space-y-4">
          <div>
            <p class="font-display text-base font-semibold text-neutral-900">{{ $t('wizard.launch.title') }}</p>
            <p class="text-sm text-neutral-500">{{ $t('wizard.launch.body') }}</p>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div><dt class="text-neutral-500">{{ $t('campaigns.name') }}</dt><dd class="text-neutral-900">{{ s.name }}</dd></div>
            <div><dt class="text-neutral-500">{{ $t('campaigns.steps.objective') }}</dt><dd class="capitalize text-neutral-900">{{ s.objective }}</dd></div>
            <div><dt class="text-neutral-500">{{ $t('campaigns.screens') }}</dt><dd class="text-neutral-900">{{ s.isWildcard ? $t('campaigns.wildcard') : $t('screens.resultCount', { count: s.screenIds.length }) }}</dd></div>
            <div><dt class="text-neutral-500">{{ $t('campaigns.budget') }}</dt><dd class="font-mono text-neutral-900">{{ s.budgetNaira ? formatKobo(String(nairaToKobo(s.budgetNaira))) : '—' }}</dd></div>
            <div><dt class="text-neutral-500">{{ $t('campaigns.dates') }}</dt><dd class="text-neutral-900">{{ s.startDate }} → {{ s.endDate }}</dd></div>
            <div v-if="quote"><dt class="text-neutral-500">{{ $t('campaigns.quoteNet') }}</dt><dd class="font-mono text-clay-700">{{ formatKobo(quote.netKobo) }}</dd></div>
          </dl>
        </div>

        <!-- Nav -->
        <div class="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="ghost" :disabled="phase === 0" @click="phase--">{{ $t('campaigns.back') }}</Button>
          <Button v-if="currentPhase !== 'launch'" :disabled="!canAdvance" @click="phase++">{{ $t('campaigns.next') }}</Button>
          <div v-else class="flex gap-3">
            <Button variant="outline" :disabled="submitting" @click="finish(false)">{{ $t('campaigns.saveDraft') }}</Button>
            <Button :disabled="submitting || !phaseValid(s, 'launch')" @click="finish(true)">
              {{ submitting ? $t('campaigns.submitting') : $t('campaigns.submit') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Right: estimate + health -->
      <template #aside>
        <EstimatePanel
          :quote="quote"
          :loading="quoteLoading"
          :ready="quoteReady"
          :breadth="breadth"
          :budget-kobo="s.budgetNaira != null ? s.budgetNaira * 100 : null"
        />
        <HealthPanel :suggestions="health" />
      </template>
    </WizardShell>
  </div>
</template>
