import { z } from 'zod'

export const NamedSegmentSchema = z.object({
  slug: z.string(),
  label: z.string(),
  venueTypes: z.array(z.string()),
})
export type NamedSegment = z.infer<typeof NamedSegmentSchema>
export const NamedSegmentsSchema = z.array(NamedSegmentSchema)

export const OutreachAudienceTypeSchema = z.enum(['behavioral', 'custom'])
export type OutreachAudienceType = z.infer<typeof OutreachAudienceTypeSchema>

export const OutreachTargetSchema = z
  .object({
    id: z.string(),
    campaignId: z.string(),
    audienceType: OutreachAudienceTypeSchema,
    namedSegment: z.string().nullable().optional(),
    venueTypes: z.array(z.string()).nullable().optional(),
    geohash5Areas: z.array(z.string()).nullable().optional(),
    dayOfWeek: z.array(z.number()).nullable().optional(),
    hourStart: z.number().nullable().optional(),
    hourEnd: z.number().nullable().optional(),
    recencyDays: z.number(),
    minFrequency: z.number(),
    customAudienceId: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough()
export type OutreachTarget = z.infer<typeof OutreachTargetSchema>

export const OutreachEstimateSchema = z.object({
  matchedSubscribers: z.number(),
  estimatedDeliveries: z.number(),
  estimatedCostKobo: z.number(),
  dailyPace: z.number(),
  flightDays: z.number(),
})
export type OutreachEstimate = z.infer<typeof OutreachEstimateSchema>

export const OutreachStatsSchema = z.object({
  totalSent: z.number(),
  totalFailed: z.number(),
  uniqueReached: z.number(),
})
export type OutreachStats = z.infer<typeof OutreachStatsSchema>

export const UpsertOutreachTargetSchema = z.object({
  audienceType: OutreachAudienceTypeSchema,
  namedSegment: z.string().optional(),
  venueTypes: z.array(z.string()).optional(),
  geohash5Areas: z.array(z.string()).optional(),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  hourStart: z.number().int().min(0).max(23).optional(),
  hourEnd: z.number().int().min(0).max(23).optional(),
  recencyDays: z.number().int().min(1).max(365).optional(),
  minFrequency: z.number().int().min(1).optional(),
  customAudienceId: z.string().uuid().optional(),
})
export type UpsertOutreachTargetRequest = z.infer<typeof UpsertOutreachTargetSchema>

export const CustomAudienceStatusSchema = z.enum(['processing', 'ready'])
export const CustomAudienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: CustomAudienceStatusSchema,
  matchCount: z.number(),
  totalUploaded: z.number(),
  createdAt: z.string(),
})
export type CustomAudience = z.infer<typeof CustomAudienceSchema>
export const CustomAudiencesSchema = z.array(CustomAudienceSchema)
