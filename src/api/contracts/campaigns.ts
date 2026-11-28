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
  'pending_approval',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected',
  'suspended',
])
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>

// POST /advertiser/campaigns
export const CampaignTypeSchema = z.enum(['screen', 'outreach'])
export type CampaignType = z.infer<typeof CampaignTypeSchema>

// Inline targeting for an Outreach campaign (mirrors backend
// OutreachTargetInputSchema). A `namedSegment` auto-resolves venue/day/hour
// filters server-side; the console only sends audienceType + namedSegment.
export const OutreachTargetSchema = z.object({
  audienceType: z.enum(['behavioral', 'custom']),
  namedSegment: z.string().min(1).max(100).optional(),
  venueTypes: z.array(z.string().min(1).max(100)).max(50).optional(),
  geohash5Areas: z.array(z.string().min(1).max(12)).max(100).optional(),
  recencyDays: z.number().int().positive().max(365).optional(),
  minFrequency: z.number().int().positive().max(100).optional(),
  customAudienceId: z.string().uuid().optional(),
})

// Inline offer (broadcast content) for an Outreach campaign (mirrors backend
// CampaignOfferInputSchema).
export const CampaignOfferSchema = z.object({
  headline: z.string().trim().min(2).max(140),
  details: z.string().trim().max(2000).optional(),
  ctaType: z.enum(['online', 'in_store', 'whatsapp', 'b2b_inquiry']),
  ctaUrl: z.string().url().max(2048).optional(),
  redemptionInstructions: z.string().trim().max(1000).optional(),
})

// One advertiser-defined scout task for "Release to Scouts" (mirrors backend
// FieldTaskInputSchema). Kobo is a string for the same bigint-safety reason as
// budgetKobo.
export const FieldTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  proofType: z.enum(['none', 'gps', 'photo', 'screenshot']),
  targetLat: z.number().min(-90).max(90).optional(),
  targetLng: z.number().min(-180).max(180).optional(),
  gpsRadiusMeters: z.number().int().positive().max(5000).optional(),
  rewardKobo: z.string().regex(/^\d+$/),
  maxCompletionsPerScout: z.number().int().positive().optional(),
  maxTotalCompletions: z.number().int().positive().optional(),
})

export const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(255),
  objective: ObjectiveSchema,
  type: CampaignTypeSchema.optional().default('screen'),
  // Outreach-only inline config. Required when type==='outreach', forbidden
  // when type==='screen' (enforced by the backend refines).
  outreachTarget: OutreachTargetSchema.optional(),
  offer: CampaignOfferSchema.optional(),
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
  // "Release to Scouts" (opt-in, screen campaigns). Tasks + a separate pool to
  // fund their rewards; an optional results bonus pays out when redemptions hit
  // the target. All mirror the backend CreateCampaignRequestSchema.
  fieldTasks: z.array(FieldTaskSchema).max(10).optional(),
  fieldTaskPoolKobo: z.string().regex(/^\d+$/).optional(),
  fieldTaskBonusPoolKobo: z.string().regex(/^\d+$/).optional(),
  redemptionTarget: z.number().int().min(0).optional(),
})
export type CreateCampaignRequest = z.infer<typeof CreateCampaignSchema>

export const UpdateCampaignSchema = CreateCampaignSchema.partial().omit({ creativeId: true })

// Consumed subset of CampaignResponseDto (passthrough for the rest).
export const CampaignSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    objective: z.string(),
    // Tolerant on purpose: the known statuses are enumerated above for
    // reference, but we accept ANY string so a newly-added backend status can
    // never fail the parse and blank the whole list/dashboard (the display
    // layer maps unknowns to a neutral pill). This bit prod when the API
    // started returning `approved`.
    status: CampaignStatusSchema.or(z.string()),
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
    // Short-lived presigned URL to play the creative inline in the preview grid,
    // plus its format (video creatives get a play button). Populated by the list
    // endpoint alongside posterUrl.
    previewUrl: z.string().nullable().optional(),
    creativeFormat: z.enum(['video', 'image']).nullable().optional(),
    pausedReason: z.string().nullable().optional(),
    suspensionReason: z.string().nullable().optional(),
    apconRejectionReason: z.string().nullable().optional(),
    // 'screen' = physical DOOH; 'outreach' = direct-to-subscriber.
    // Not present on legacy rows — treat absence as 'screen'.
    type: z.enum(['screen', 'outreach']).optional().default('screen'),
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
    // Tier budget bounds (kobo) — the authoritative floor/ceiling to enforce
    // client-side. `maxCampaignKobo` is null for unlimited tiers.
    minCampaignKobo: z.string().nullable().optional(),
    maxCampaignKobo: z.string().nullable().optional(),
  })
  .passthrough()
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
