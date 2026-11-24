import { api } from './client'
import {
  NamedSegmentsSchema,
  OutreachTargetSchema,
  OutreachEstimateSchema,
  OutreachStatsSchema,
  CustomAudiencesSchema,
  type UpsertOutreachTargetRequest,
} from './contracts/outreach'
import { z } from 'zod'

export function listNamedSegments() {
  return api.get('/advertiser/outreach/segments', NamedSegmentsSchema)
}

export function getOutreachTarget(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/outreach/target`, OutreachTargetSchema.nullable())
}

export function upsertOutreachTarget(campaignId: string, input: UpsertOutreachTargetRequest) {
  return api.put(`/advertiser/campaigns/${campaignId}/outreach/target`, input)
}

export function estimateAudience(
  campaignId: string,
  input: UpsertOutreachTargetRequest & { budgetKobo: string; bidCpmKobo: string; flightDays: number },
) {
  return api.post(`/advertiser/campaigns/${campaignId}/outreach/estimate`, input, OutreachEstimateSchema)
}

export function getOutreachStats(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/outreach/stats`, OutreachStatsSchema)
}

export function listCustomAudiences() {
  return api.get('/advertiser/audiences', CustomAudiencesSchema)
}

export function createCustomAudience(name: string) {
  return api.post('/advertiser/audiences', { name }, z.object({ id: z.string() }))
}

export function uploadAudienceContacts(
  audienceId: string,
  input: { emails?: string[]; phones?: string[] },
) {
  return api.post(`/advertiser/audiences/${audienceId}/contacts`, input)
}
