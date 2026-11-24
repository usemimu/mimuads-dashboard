import { z } from 'zod'

export const FieldCampaignStatusSchema = z.enum(['draft', 'active', 'paused', 'completed'])
export type FieldCampaignStatus = z.infer<typeof FieldCampaignStatusSchema>

export const FieldCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  budgetPoolKobo: z.string(),
  poolRemainingKobo: z.string(),
  baseRateKobo: z.string(),
  qualityBonusKobo: z.string(),
  status: FieldCampaignStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  scoutCount: z.number().optional(),
  totalClaims: z.number().optional(),
})
export type FieldCampaign = z.infer<typeof FieldCampaignSchema>

export const FieldCampaignOrNullSchema = FieldCampaignSchema.nullable()

export const HeatmapPointSchema = z.object({
  geohash6: z.string(),
  claims: z.number(),
  totalEarnedKobo: z.number(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})
export type HeatmapPoint = z.infer<typeof HeatmapPointSchema>

export const HeatmapSchema = z.array(HeatmapPointSchema)

export const ScoutSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  referralCode: z.string(),
  totalEarnedKobo: z.string(),
  qualityScore: z.number(),
  activitiesCount: z.number().optional(),
})
export type Scout = z.infer<typeof ScoutSchema>

export const TopScoutsSchema = z.array(ScoutSchema)

export const CreateFieldCampaignSchema = z.object({
  name: z.string().min(1),
  budgetPoolKobo: z.string(),
  baseRateKobo: z.string().optional(),
  qualityBonusKobo: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
})
export type CreateFieldCampaignRequest = z.infer<typeof CreateFieldCampaignSchema>
