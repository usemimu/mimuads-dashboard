import { api } from './client'
import { DataExportSchema, LookalikeSchema } from './contracts/analytics'

export function getCampaignDataExport(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/data-export`, DataExportSchema)
}

export function getLookalikeAudience(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/lookalike`, LookalikeSchema)
}

export function getLookalikeOutreachParams(campaignId: string) {
  return api.post(`/advertiser/campaigns/${campaignId}/lookalike/to-outreach`, {})
}
