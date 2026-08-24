import type { WizardState } from './wizard'
import type { QuoteResponse } from '@/api/contracts/campaigns'

/**
 * Campaign-health rule engine — the OOH analogue of X Ads Manager's
 * "Healthy / Needs attention" suggestions. Pure: takes the wizard draft (+ a
 * little context) and returns issues worth surfacing, ranked by impact. Copy
 * lives in i18n under `wizard.health.<id>.{title,body}` (keyed by `id`), so the
 * panel translates; this stays logic-only.
 */

export type HealthImpact = 'high' | 'medium' | 'info'

export interface HealthSuggestion {
  id: string
  impact: HealthImpact
}

export interface HealthContext {
  quote?: QuoteResponse | null
  walletBalanceKobo?: string | null
}

const RANK: Record<HealthImpact, number> = { high: 0, medium: 1, info: 2 }

export function evaluateHealth(s: WizardState, ctx: HealthContext = {}): HealthSuggestion[] {
  const out: HealthSuggestion[] = []

  if (!s.creativeId) out.push({ id: 'noCreative', impact: 'high' })

  if (!s.isWildcard && s.screenIds.length === 0) {
    out.push({ id: 'noScreens', impact: 'high' })
  } else if (!s.isWildcard && s.screenIds.length === 1) {
    out.push({ id: 'oneScreen', impact: 'medium' })
  }

  if (s.hours.length === 0 && s.daysOfWeek.length === 0) {
    out.push({ id: 'allTime', impact: 'info' })
  }

  const net = ctx.quote ? Number(ctx.quote.netKobo) : null
  if (net != null && s.budgetNaira != null && s.budgetNaira * 100 < net) {
    out.push({ id: 'budgetLow', impact: 'medium' })
  }

  const wallet = ctx.walletBalanceKobo != null ? Number(ctx.walletBalanceKobo) : null
  if (wallet != null && net != null && wallet < net) {
    out.push({ id: 'walletLow', impact: 'high' })
  }

  if (s.startDate && s.endDate) {
    const days = (Date.parse(s.endDate) - Date.parse(s.startDate)) / 86_400_000
    if (days > 0 && days < 3) out.push({ id: 'shortFlight', impact: 'info' })
  }

  return out.sort((a, b) => RANK[a.impact] - RANK[b.impact])
}
