import { api } from './client'
import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  CampaignSchema,
  CampaignListResponseSchema,
  SubmitCampaignResponseSchema,
  TopUpSchema,
  ExtendSchema,
  QuoteRequestSchema,
  QuoteResponseSchema,
  type CreateCampaignRequest,
  type CampaignListQuery,
  type QuoteRequest,
} from './contracts/campaigns'

export function createCampaign(input: CreateCampaignRequest) {
  return api.post('/advertiser/campaigns', CreateCampaignSchema.parse(input), CampaignSchema)
}
export function updateCampaign(id: string, patch: Partial<CreateCampaignRequest>) {
  return api.patch(`/advertiser/campaigns/${id}`, UpdateCampaignSchema.parse(patch), CampaignSchema)
}
export function submitCampaign(id: string) {
  return api.post(`/advertiser/campaigns/${id}/submit`, {}, SubmitCampaignResponseSchema)
}
export function listCampaigns(query: CampaignListQuery = {}) {
  const p = new URLSearchParams()
  if (query.status) p.set('status', query.status)
  const s = p.toString()
  return api.get(`/advertiser/campaigns${s ? `?${s}` : ''}`, CampaignListResponseSchema)
}
export function getCampaign(id: string) {
  return api.get(`/advertiser/campaigns/${id}`, CampaignSchema)
}
export function pauseCampaign(id: string) {
  return api.post(`/advertiser/campaigns/${id}/pause`, {})
}
export function resumeCampaign(id: string) {
  return api.post(`/advertiser/campaigns/${id}/resume`, {})
}
export function topUpCampaign(id: string, amountKobo: string, idempotencyKey: string) {
  return api.post(`/advertiser/campaigns/${id}/topup`, TopUpSchema.parse({ amountKobo, idempotencyKey }))
}
export function extendCampaign(id: string, endDate: string) {
  return api.post(`/advertiser/campaigns/${id}/extend`, ExtendSchema.parse({ endDate }))
}
export function cloneCampaign(id: string) {
  return api.post(`/advertiser/campaigns/${id}/clone`, {}, CampaignSchema)
}

/** Live pricing quote (gross → volume discount → net) for the budget step. */
export function getQuote(req: QuoteRequest) {
  const parsed = QuoteRequestSchema.parse(req)
  const p = new URLSearchParams()
  if (parsed.isWildcard) p.set('isWildcard', 'true')
  parsed.screenIds?.forEach((id) => p.append('screenIds', id))
  p.set('startDate', parsed.startDate)
  p.set('endDate', parsed.endDate)
  parsed.targetHours?.forEach((h) => p.append('targetHours', String(h)))
  parsed.targetDaysOfWeek?.forEach((d) => p.append('targetDaysOfWeek', String(d)))
  return api.get(`/advertiser/screens/quote?${p.toString()}`, QuoteResponseSchema)
}

// Performance + decision factors (inline responses — modelled permissively).
export function getPerformance(id: string) {
  return api.get(`/advertiser/campaigns/${id}/performance`)
}
export function getPerformanceBreakdown(id: string, dim: 'by-screen' | 'by-hour' | 'by-day') {
  return api.get(`/advertiser/campaigns/${id}/performance/${dim}`)
}
export function getDecisionFactors(id: string) {
  return api.get(`/advertiser/reports/campaigns/${id}/decision-factors`)
}
