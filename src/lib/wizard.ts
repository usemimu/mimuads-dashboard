import { nairaToKobo } from './money'
import type { CreateCampaignRequest, Objective } from '@/api/contracts/campaigns'

/**
 * Pure campaign-wizard state + validation. No business rules here (budget
 * ceilings, eligibility etc. are the backend's) — this validates SHAPE and
 * step-completeness only, and builds the create payload from integer kobo.
 */
export interface WizardState {
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
}

export function emptyWizard(): WizardState {
  return {
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
  }
}

export const WIZARD_STEPS = ['objective', 'screens', 'schedule', 'budget', 'creative', 'review'] as const
export type WizardStep = (typeof WIZARD_STEPS)[number]

/**
 * The X-style presentation groups the six sub-steps into four rail phases.
 * State + validation stay per-step; a phase is complete when all its sub-steps
 * validate.
 */
export const WIZARD_PHASES = ['objective', 'audience', 'creative', 'launch'] as const
export type WizardPhase = (typeof WIZARD_PHASES)[number]

const PHASE_STEPS: Record<WizardPhase, WizardStep[]> = {
  objective: ['objective'],
  audience: ['screens', 'schedule', 'budget'],
  creative: ['creative'],
  launch: ['review'],
}

export function phaseValid(s: WizardState, phase: WizardPhase): boolean {
  return PHASE_STEPS[phase].every((st) => stepValid(s, st))
}

/** Whether a given step's inputs are complete enough to advance. */
export function stepValid(s: WizardState, step: WizardStep): boolean {
  switch (step) {
    case 'objective':
      return s.objective !== '' && s.name.trim().length >= 3
    case 'screens':
      return s.isWildcard || s.screenIds.length >= 1
    case 'schedule':
      return s.startDate !== '' && s.endDate !== '' && s.startDate < s.endDate
    case 'budget':
      return s.budgetNaira != null && s.budgetNaira > 0
    case 'creative':
      return s.creativeId !== ''
    case 'review':
      return WIZARD_STEPS.slice(0, 5).every((st) => stepValid(s, st))
  }
}

/** ISO datetime at start of a yyyy-mm-dd day (UTC). */
function toIso(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString()
}

/** Build the create-campaign payload. Throws if the wizard isn't complete. */
export function buildCreatePayload(s: WizardState): CreateCampaignRequest {
  if (!stepValid(s, 'review')) throw new Error('wizard incomplete')
  return {
    name: s.name.trim(),
    objective: s.objective as Objective,
    creativeId: s.creativeId,
    isWildcard: s.isWildcard,
    screenIds: s.isWildcard ? undefined : s.screenIds,
    targetDaysOfWeek: s.daysOfWeek.length ? s.daysOfWeek : undefined,
    targetHoursOfDay: s.hours.length ? s.hours : undefined,
    budgetKobo: String(nairaToKobo(s.budgetNaira!)),
    dailyBudgetCapKobo: s.dailyCapNaira != null ? String(nairaToKobo(s.dailyCapNaira)) : undefined,
    startDate: toIso(s.startDate),
    endDate: toIso(s.endDate),
    isEvenPacing: s.isEvenPacing || undefined,
  }
}
