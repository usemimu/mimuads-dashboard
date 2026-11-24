import { api } from './client'
import {
  UpsertOfferSchema,
  OfferSchema,
  OfferOrNullSchema,
  LeadsSchema,
  type UpsertOfferRequest,
} from './contracts/offers'

/** Read the campaign's offer (or null if none set yet). */
export function getOffer(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/offer`, OfferOrNullSchema)
}

/** Create or update the offer. Any edit returns it to `draft` server-side. */
export function upsertOffer(campaignId: string, input: UpsertOfferRequest) {
  return api.put(
    `/advertiser/campaigns/${campaignId}/offer`,
    UpsertOfferSchema.parse(input),
    OfferSchema,
  )
}

/** Submit the offer for admin review. */
export function submitOffer(campaignId: string) {
  return api.post(
    `/advertiser/campaigns/${campaignId}/offer/submit`,
    {},
    OfferSchema,
  )
}

/** List B2B inquiry leads for a campaign. */
export function getCampaignLeads(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/leads`, LeadsSchema)
}

/** Mark a lead as viewed (no-op if already past 'new'). */
export function markLeadViewed(campaignId: string, leadId: string) {
  return api.patch(
    `/advertiser/campaigns/${campaignId}/leads/${leadId}/viewed`,
    {},
  )
}
