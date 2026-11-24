import { z } from 'zod'

export const TopAreaSchema = z.object({
  geohash5: z.string(),
  claimCount: z.number(),
})

export const DataExportSummarySchema = z.object({
  totalClaims: z.number(),
  totalRedemptions: z.number(),
  conversionRate: z.number(),
  uniqueSubscribers: z.number(),
  topVenueTypes: z.array(z.string()),
  peakHour: z.string().nullable(),
  peakDay: z.string().nullable(),
})

export const DataExportSchema = z.object({
  campaignId: z.string(),
  exportedAt: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  claimsByHour: z.array(z.record(z.unknown())),
  topGeohash5Areas: z.array(TopAreaSchema),
  audienceVisitPatterns: z.array(z.record(z.unknown())),
  summary: DataExportSummarySchema,
})

export const LookalikePatternSchema = z.object({
  geohash5s: z.array(z.string()),
  venueTypes: z.array(z.string()),
  peakDays: z.array(z.number()),
  peakHours: z.array(z.number()),
})

export const SuggestedTargetSchema = z.object({
  audienceType: z.literal('behavioral'),
  geohash5Areas: z.array(z.string()),
  venueTypes: z.array(z.string()),
  dayOfWeek: z.array(z.number()),
  hourStart: z.number().optional(),
  hourEnd: z.number().optional(),
}).nullable()

export const LookalikeSchema = z.object({
  seedSize: z.number(),
  lookalikes: z.array(z.object({
    subscriberId: z.string(),
    geohashMatches: z.number(),
    venueMatches: z.number(),
    totalVisits: z.number(),
  })),
  topPatterns: LookalikePatternSchema,
  suggestedTarget: SuggestedTargetSchema,
})

export type DataExport = z.infer<typeof DataExportSchema>
export type Lookalike = z.infer<typeof LookalikeSchema>
export type SuggestedTarget = z.infer<typeof SuggestedTargetSchema>
