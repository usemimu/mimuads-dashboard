import { z } from 'zod'

/**
 * Campaign offer contracts. Mirror apps/api/src/offers/dto + the
 * campaign_offers row. The offer shown on the QR landing page / emailed to
 * opted-in audiences (see mimu/docs/offers-opt-in.md).
 */

export const OfferCtaTypeSchema = z.enum(['online', 'in_store', 'whatsapp'])
export type OfferCtaType = z.infer<typeof OfferCtaTypeSchema>

export const OfferStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'paused',
])
export type OfferStatus = z.infer<typeof OfferStatusSchema>

// PUT /advertiser/campaigns/:id/offer
export const UpsertOfferSchema = z.object({
  headline: z.string().trim().min(3).max(140),
  details: z.string().trim().max(2000).optional(),
  ctaType: OfferCtaTypeSchema,
  ctaUrl: z.string().url().max(2048).optional(),
  redemptionInstructions: z.string().trim().max(1000).optional(),
  imageKey: z.string().max(512).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  redemptionCap: z.number().int().positive().max(1_000_000).optional(),
})
export type UpsertOfferRequest = z.infer<typeof UpsertOfferSchema>

export const OfferSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  orgId: z.string().uuid(),
  headline: z.string(),
  details: z.string().nullable(),
  ctaType: OfferCtaTypeSchema,
  ctaUrl: z.string().nullable(),
  redemptionInstructions: z.string().nullable(),
  imageKey: z.string().nullable(),
  validFrom: z.string().nullable(),
  validUntil: z.string().nullable(),
  redemptionCap: z.number().nullable(),
  status: OfferStatusSchema,
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Offer = z.infer<typeof OfferSchema>

// GET returns the offer or null when the campaign has none yet.
export const OfferOrNullSchema = OfferSchema.nullable()
