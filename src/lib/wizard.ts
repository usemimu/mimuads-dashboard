import { nairaToKobo } from './money'
import type { CreateCampaignRequest, Objective, CampaignType } from '@/api/contracts/campaigns'

/**
 * Pure campaign-wizard state + validation. No business rules here (budget
 * ceilings, eligibility etc. are the backend's) — this validates SHAPE and
 * step-completeness only, and builds the create payload from integer kobo.
 */
export interface WizardState {
  // 'screen' = physical DOOH; 'outreach' = direct-to-subscriber offer send.
  // Outreach skips the objective + screens steps (the backend forces
  // objective=conversion internally) and instead picks an audience + offer.
  type: CampaignType
  name: string
  objective: Objective | ''
  isWildcard: boolean
  screenIds: string[]
  startDate: string // yyyy-mm-dd
  endDate: string
  daysOfWeek: number[] // 0-6, empty = all
  hours: number[] // 0-23, empty = all
  budgetNaira: number | null
  dailyCapNaira: number | null
  isEvenPacing: boolean // delivery: false = standard, true = even
  creativeId: string | ''
  // Creative can be a single asset OR a carousel (ordered image/video frames
  // shown in one <=30s slot). A carousel IS a creative, so the payload still
  // sends one `creativeId` (= the carousel's id) either way.
  creativeMode: 'single' | 'carousel'
  carouselId: string | ''
  carouselItems: CarouselDraftItem[]
  carouselConfirmed: boolean // finalized (backend confirmCarousel) → ready to submit

  // ── Outreach (type === 'outreach') ─────────────────────────────────────
  /** Named audience persona slug (e.g. 'working_adults'), or 'all' for every
   *  opted-in subscriber (→ a filterless behavioral target server-side). */
  outreachSegment: string | ''
  offerHeadline: string
  /** 'in_store' | 'online' | 'whatsapp' */
  offerCtaType: OfferCtaType
  offerCtaUrl: string
  offerDetails: string

  // ── Release to Scouts (opt-in, screen campaigns) ───────────────────────
  releaseToScouts: boolean
  fieldTasks: FieldTaskDraft[]
  /** Scout reward pool in ₦ (×100 → kobo on submit). Distinct from media budget. */
  fieldTaskPoolNaira: number | null
  /** Results-bonus pool in ₦ — shared among scouts when redemptions hit target. */
  fieldTaskBonusNaira: number | null
  redemptionTarget: number | null
}

export interface CarouselDraftItem {
  itemId: string
  format: 'image' | 'video'
  filename: string
  dwellSeconds: number
  /** Local object-URL of the picked file, for thumbnails + sequence preview. */
  previewUrl?: string
}

/** One advertiser-defined scout task (Release to Scouts). Mirrors the backend
 *  FieldTaskInputSchema. GPS proof is deferred (needs a map picker) — the
 *  console offers none/photo/screenshot like the mobile editor. */
export interface FieldTaskDraft {
  /** Stable client id for list keys/edits (never sent to the API). */
  id: string
  title: string
  description: string
  proofType: 'none' | 'photo' | 'screenshot'
  rewardNaira: number
  maxTotalCompletions: number | null
}

export type OfferCtaType = 'in_store' | 'online' | 'whatsapp'

/** Outreach CTA types the console surfaces (the backend also accepts
 *  'b2b_inquiry', not exposed here). */
export const OFFER_CTA_TYPES: OfferCtaType[] = ['in_store', 'online', 'whatsapp']

/** CTA types that carry an external link instead of in-store redemption copy. */
export function ctaNeedsUrl(cta: OfferCtaType): boolean {
  return cta === 'online' || cta === 'whatsapp'
}

/** The five named behavioral personas (+ 'all' wildcard) — mirrors the mobile
 *  create_audience_screen and the backend outreach named segments. */
export const OUTREACH_PERSONAS = [
  'working_adults',
  'weekend_shoppers',
  'health_conscious',
  'night_out',
  'family_household',
] as const
export type OutreachPersona = (typeof OUTREACH_PERSONAS)[number]

/** Suggested floor for a scout task reward (₦) — "worth a scout's trip".
 *  Mirrors the mobile `scoutRewardFloorNaira`. */
export const SCOUT_REWARD_FLOOR_NAIRA = 2000

export const CAROUSEL_MIN_ITEMS = 2
export const CAROUSEL_MAX_ITEMS = 6
export const CAROUSEL_MAX_TOTAL_SECONDS = 30

/** Minimum total campaign budget, in naira. Absolute floor for the smallest
 * selection; the real gate is "budget must cover the day-rate quote" (checked
 * in the view against the live quote, authoritative on the backend). */
export const MIN_BUDGET_NAIRA = 50_000

/** Flight-length bounds (days), mirroring the backend's validateDates
 * (MIN_CAMPAIGN_DAYS=2, MAX_CAMPAIGN_DAYS=186 ≈ 6 months). */
export const MIN_CAMPAIGN_DAYS = 2
export const MAX_CAMPAIGN_DAYS = 186

export function carouselTotalSeconds(items: CarouselDraftItem[]): number {
  return items.reduce((s, i) => s + i.dwellSeconds, 0)
}

export function emptyWizard(): WizardState {
  return {
    type: 'screen',
    name: '',
    objective: '',
    isWildcard: false,
    screenIds: [],
    startDate: '',
    endDate: '',
    daysOfWeek: [],
    hours: [],
    budgetNaira: null,
    dailyCapNaira: null,
    isEvenPacing: false,
    creativeId: '',
    creativeMode: 'single',
    carouselId: '',
    carouselItems: [],
    carouselConfirmed: false,
    outreachSegment: '',
    offerHeadline: '',
    offerCtaType: 'in_store',
    offerCtaUrl: '',
    offerDetails: '',
    releaseToScouts: false,
    fieldTasks: [],
    fieldTaskPoolNaira: null,
    fieldTaskBonusNaira: null,
    redemptionTarget: null,
  }
}

/** Create a blank scout task seeded at the reward floor. */
export function emptyFieldTask(): FieldTaskDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    proofType: 'photo',
    rewardNaira: SCOUT_REWARD_FLOOR_NAIRA,
    maxTotalCompletions: null,
  }
}

// All possible sub-steps. The active set depends on the campaign type:
//  - screen:   type → objective → screens → schedule → budget → scouts → creative → review
//  - outreach: type → audience → offer → schedule → budget → creative → review
//             (objective + screens are skipped; backend forces objective=conversion)
export const WIZARD_STEPS = [
  'type',
  'objective',
  'audience',
  'offer',
  'screens',
  'schedule',
  'budget',
  'scouts',
  'creative',
  'review',
] as const
export type WizardStep = (typeof WIZARD_STEPS)[number]

/**
 * The X-style presentation groups the sub-steps into rail phases. State +
 * validation stay per-step; a phase is complete when all its sub-steps
 * validate. The phase list is type-dependent — outreach swaps the
 * objective/screens phases for audience/offer and drops the scouts step.
 */
export const WIZARD_PHASES = ['type', 'objective', 'audience', 'creative', 'launch'] as const
export type WizardPhase = (typeof WIZARD_PHASES)[number]

/** Sub-steps per phase, for the CURRENT campaign type. */
function phaseSteps(type: CampaignType, phase: WizardPhase): WizardStep[] {
  if (type === 'outreach') {
    switch (phase) {
      case 'type':
        return ['type']
      // Reuse the 'objective' phase slot for the outreach audience + offer.
      case 'objective':
        return ['audience', 'offer']
      case 'audience':
        return ['schedule', 'budget']
      case 'creative':
        return ['creative']
      case 'launch':
        return ['review']
    }
  }
  switch (phase) {
    case 'type':
      return ['type']
    case 'objective':
      return ['objective']
    case 'audience':
      return ['screens', 'schedule', 'budget', 'scouts']
    case 'creative':
      return ['creative']
    case 'launch':
      return ['review']
  }
}

/** Steps the given type actually uses (flattened, in order). */
export function activeSteps(type: CampaignType): WizardStep[] {
  return WIZARD_PHASES.flatMap((p) => phaseSteps(type, p))
}

export function phaseValid(s: WizardState, phase: WizardPhase): boolean {
  return phaseSteps(s.type, phase).every((st) => stepValid(s, st))
}

/** Total kobo the scout pool must at least cover (one completion of each task). */
export function scoutPoolMinKobo(s: WizardState): number {
  return s.fieldTasks.reduce((sum, t) => sum + nairaToKobo(t.rewardNaira), 0)
}

/** Whether a given step's inputs are complete enough to advance. */
export function stepValid(s: WizardState, step: WizardStep): boolean {
  switch (step) {
    case 'type':
      // Name + a chosen type gate the first phase (name is collected here so
      // outreach, which skips the objective step, still captures it).
      return (s.type === 'screen' || s.type === 'outreach') && s.name.trim().length >= 3
    case 'objective':
      return s.objective !== '' && s.name.trim().length >= 3
    case 'audience':
      // Outreach: an audience persona (or 'all') must be chosen.
      return s.outreachSegment !== ''
    case 'offer':
      // Outreach: a headline is required; a URL CTA needs a non-empty url.
      if (s.offerHeadline.trim().length < 2) return false
      if (ctaNeedsUrl(s.offerCtaType) && s.offerCtaUrl.trim().length === 0) return false
      return true
    case 'screens':
      return s.isWildcard || s.screenIds.length >= 1
    case 'schedule': {
      if (s.startDate === '' || s.endDate === '' || s.startDate >= s.endDate) return false
      const days = Math.round((Date.parse(s.endDate) - Date.parse(s.startDate)) / 86_400_000)
      return days >= MIN_CAMPAIGN_DAYS && days <= MAX_CAMPAIGN_DAYS
    }
    case 'budget':
      return s.budgetNaira != null && s.budgetNaira >= MIN_BUDGET_NAIRA
    case 'scouts': {
      // Optional step. Valid when off, OR when on + every task is well-formed +
      // the pool covers at least one completion of each + (if a bonus is set)
      // a redemption target exists. Mirrors the backend refines.
      if (!s.releaseToScouts || s.fieldTasks.length === 0) return true
      const tasksOk = s.fieldTasks.every(
        (t) => t.title.trim().length >= 2 && t.rewardNaira > 0,
      )
      if (!tasksOk) return false
      const pool = s.fieldTaskPoolNaira != null ? nairaToKobo(s.fieldTaskPoolNaira) : 0
      if (pool < scoutPoolMinKobo(s)) return false
      if (s.fieldTaskBonusNaira != null && s.fieldTaskBonusNaira > 0) {
        if (s.redemptionTarget == null || s.redemptionTarget <= 0) return false
      }
      return true
    }
    case 'creative':
      if (s.creativeMode === 'carousel') {
        return (
          s.carouselId !== '' &&
          s.carouselConfirmed &&
          s.carouselItems.length >= CAROUSEL_MIN_ITEMS &&
          s.carouselItems.length <= CAROUSEL_MAX_ITEMS &&
          carouselTotalSeconds(s.carouselItems) <= CAROUSEL_MAX_TOTAL_SECONDS
        )
      }
      return s.creativeId !== ''
    case 'review':
      // Every active step except the review itself must validate.
      return activeSteps(s.type)
        .filter((st) => st !== 'review')
        .every((st) => stepValid(s, st))
  }
}

/** ISO datetime at start of a yyyy-mm-dd day (UTC). */
function toIso(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString()
}

/** Build the create-campaign payload. Throws if the wizard isn't complete. */
export function buildCreatePayload(s: WizardState): CreateCampaignRequest {
  if (!stepValid(s, 'review')) throw new Error('wizard incomplete')
  const isOutreach = s.type === 'outreach'
  const payload: CreateCampaignRequest = {
    name: s.name.trim(),
    // Outreach has no objective step — the backend forces conversion, so send
    // it explicitly (the field is required on the API).
    objective: isOutreach ? 'conversion' : (s.objective as Objective),
    type: s.type,
    // A carousel is a creative: the campaign references its id like any other.
    creativeId: s.creativeMode === 'carousel' ? s.carouselId : s.creativeId,
    // Outreach runs everywhere (no physical screens); mirror mobile's isWildcard.
    isWildcard: isOutreach ? true : s.isWildcard,
    screenIds: isOutreach || s.isWildcard ? undefined : s.screenIds,
    targetDaysOfWeek: s.daysOfWeek.length ? s.daysOfWeek : undefined,
    targetHoursOfDay: s.hours.length ? s.hours : undefined,
    budgetKobo: String(nairaToKobo(s.budgetNaira!)),
    dailyBudgetCapKobo: s.dailyCapNaira != null ? String(nairaToKobo(s.dailyCapNaira)) : undefined,
    startDate: toIso(s.startDate),
    endDate: toIso(s.endDate),
    // Always send the explicit choice — the backend DEFAULTS to even pacing, so
    // omitting `false` (Standard) would silently flip the campaign to Even.
    isEvenPacing: s.isEvenPacing,
  }

  if (isOutreach) {
    payload.outreachTarget = {
      audienceType: 'behavioral',
      // 'all' = everyone on the list → send no segment (the backend treats a
      // filterless behavioral target as "everyone").
      ...(s.outreachSegment && s.outreachSegment !== 'all'
        ? { namedSegment: s.outreachSegment }
        : {}),
    }
    payload.offer = {
      headline: s.offerHeadline.trim(),
      ctaType: s.offerCtaType,
      ...(s.offerCtaUrl.trim() ? { ctaUrl: s.offerCtaUrl.trim() } : {}),
      ...(s.offerDetails.trim() ? { details: s.offerDetails.trim() } : {}),
    }
  } else if (s.releaseToScouts && s.fieldTasks.length > 0) {
    // Release to Scouts (opt-in, screen only). Pool kept separate from the
    // media budget above.
    payload.fieldTaskPoolKobo = String(nairaToKobo(s.fieldTaskPoolNaira ?? 0))
    payload.fieldTasks = s.fieldTasks.map((t) => ({
      title: t.title.trim(),
      ...(t.description.trim() ? { description: t.description.trim() } : {}),
      proofType: t.proofType,
      rewardKobo: String(nairaToKobo(t.rewardNaira)),
      ...(t.maxTotalCompletions != null
        ? { maxTotalCompletions: t.maxTotalCompletions }
        : {}),
    }))
    // Results bonus (optional): scouts share it when redemptions hit target.
    if (s.fieldTaskBonusNaira != null && s.fieldTaskBonusNaira > 0) {
      payload.fieldTaskBonusPoolKobo = String(nairaToKobo(s.fieldTaskBonusNaira))
      payload.redemptionTarget = s.redemptionTarget ?? 0
    }
  }

  return payload
}
