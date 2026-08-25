import { z } from 'zod'

/**
 * Campaign + quote contracts. Mirror apps/api/src/campaigns/dto and are
 * drift-checked against /openapi.json (the response DTOs were registered for the
 * console — see the backend 087d8c1 change). List/quote REQUEST query DTOs aren't
 * OpenAPI components, so those are modelled but not drift-checked.
 */

export const ObjectiveSchema = z.enum(['awareness', 'consideration', 'conversion'])
export type Objective = z.infer<typeof ObjectiveSchema>

export const CampaignStatusSchema = z.enum([
  'draft',
  'pending_payment',
  'pending_vetting',
  'active',
  'paused',
  'completed',
  'rejected',
  'suspended',
])
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>

// POST /advertiser/campaigns
export const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(255),
  objective: ObjectiveSchema,
  creativeId: z.string().uuid(),
  isWildcard: z.boolean().optional(),
  screenIds: z.array(z.string().uuid()).max(50).optional(),
  targetDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  targetHoursOfDay: z.array(z.number().int().min(0).max(23)).optional(),
  budgetKobo: z.string().regex(/^\d+$/),
  dailyBudgetCapKobo: z.string().regex(/^\d+$/).optional(),
  startDate: z.string(),
  endDate: z.string(),
  isEvenPacing: z.boolean().optional(),
})
export type CreateCampaignRequest = z.infer<typeof CreateCampaignSchema>

export const UpdateCampaignSchema = CreateCampaignSchema.partial().omit({ creativeId: true })

// Consumed subset of CampaignResponseDto (passthrough for the rest).
export const CampaignSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    objective: z.string(),
    status: CampaignStatusSchema,
    // The list endpoint returns these; the detail (GET :id) + update responses
    // omit them despite CampaignResponseDto declaring them — backend divergence
    // flagged in IMPLEMENTATION-NOTES, so keep them optional here.
    isWildcard: z.boolean().optional(),
    screenCount: z.number().optional(),
    budgetKobo: z.string(),
    spentKobo: z.string(),
    remainingKobo: z.string(),
    dailyBudgetCapKobo: z.string().nullable().optional(),
    // Committed CPM (kobo) locked at submit + a display-formatted version.
    // Present on the detail response; null on legacy rows.
    bidCpmKobo: z.string().nullable().optional(),
    formattedBidCpm: z.string().nullable().optional(),
    startDate: z.string(),
    endDate: z.string(),
    createdAt: z.string(),
    creative: z.unknown().optional(),
    // Signed poster (cover image) for the campaign's creative — populated by the
    // list endpoint so the console can render a preview grid.
    posterUrl: z.string().nullable().optional(),
    pausedReason: z.string().nullable().optional(),
    suspensionReason: z.string().nullable().optional(),
    apconRejectionReason: z.string().nullable().optional(),
  })
  .passthrough()
export type Campaign = z.infer<typeof CampaignSchema>

export const CampaignListResponseSchema = z.object({
  campaigns: z.array(CampaignSchema),
  pagination: z
    .object({ limit: z.number(), offset: z.number(), total: z.number(), hasMore: z.boolean() })
    .optional(),
})

export const SubmitCampaignResponseSchema = z
  .object({
    campaignId: z.string(),
    status: z.string(),
    message: z.string(),
  })
  .passthrough()

export const TopUpSchema = z.object({
  amountKobo: z.string().regex(/^\d+$/),
  idempotencyKey: z.string().min(8).max(128),
})
export const ExtendSchema = z.object({ endDate: z.string() })

// GET /advertiser/campaigns query (not an OpenAPI component)
export const CampaignListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
})
export type CampaignListQuery = z.infer<typeof CampaignListQuerySchema>

// GET /advertiser/screens/quote (request query — not an OpenAPI component)
export const QuoteRequestSchema = z.object({
  isWildcard: z.boolean().optional(),
  screenIds: z.array(z.string().uuid()).max(50).optional(),
  startDate: z.string(),
  endDate: z.string(),
  targetHours: z.array(z.number().int().min(0).max(23)).optional(),
  targetDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
})
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>

// Consumed subset of PricingQuoteResponseDto.
export const QuoteResponseSchema = z
  .object({
    isWildcard: z.boolean(),
    grossKobo: z.string(),
    discountPct: z.number(),
    netKobo: z.string(),
    estimatedImpressions: z.number(),
    estimatedPlays: z.number(),
    // Unique daily audience of the selection; impressions ÷ reach ≈ frequency.
    estimatedReach: z.number().optional(),
    costPerThousandImpressions: z.number(),
    // Committed CPM (kobo) that will be locked at submit — what the engine
    // bills against. Prefer this over costPerThousandImpressions for display.
    bidCpmKobo: z.string().optional(),
    durationDays: z.number(),
    totalScreens: z.number().optional(),
  })
  .passthrough()
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
