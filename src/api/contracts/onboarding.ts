import { z } from 'zod'

/**
 * Onboarding contracts (slice 2): org creation (business-profile), locations,
 * KYC/verification, invite accept. Mirror apps/api and are drift-checked where a
 * named OpenAPI component exists.
 */

export const BusinessCategorySchema = z.enum([
  'restaurant',
  'fashion',
  'fintech',
  'tech',
  'salon',
  'pharmacy',
  'education',
  'religious',
  'political',
  'real_estate',
  'automotive',
  'healthcare',
  'fmcg',
  'entertainment',
  'other',
])
export type BusinessCategory = z.infer<typeof BusinessCategorySchema>

export const BusinessTypeSchema = z.enum([
  'sme',
  'agency',
  'brand',
  'political',
  'religious',
  'educational',
])
export type BusinessType = z.infer<typeof BusinessTypeSchema>

// ── POST /advertiser/business-profile (creates org + owner membership) ───────
// Required mirrors the backend; the console collects these even where PRD Page 3
// omitted them (option A — console adapts to backend).
export const CreateBusinessProfileSchema = z.object({
  businessName: z.string().min(2).max(100),
  displayName: z.string().min(2).max(100).optional(),
  country: z.string().length(2).optional(), // defaults to NG server-side
  businessCategory: BusinessCategorySchema,
  state: z.string().min(2).max(64),
  lga: z.string().min(2).max(64),
  businessType: BusinessTypeSchema,
  approxClients: z.number().int().positive().max(100000).optional(),
})
export type CreateBusinessProfileRequest = z.infer<typeof CreateBusinessProfileSchema>

export const BusinessProfileResponseSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  displayName: z.string(),
  country: z.string(),
  businessCategory: BusinessCategorySchema,
  state: z.string().nullable(),
  lga: z.string().nullable(),
  businessType: BusinessTypeSchema,
  approxClients: z.number().nullable(),
  isAgency: z.boolean(),
  isComplete: z.boolean(),
})
export type BusinessProfileResponse = z.infer<typeof BusinessProfileResponseSchema>

// ── PATCH /advertiser/business-profile (edit) ────────────────────────────────
// All fields optional (partial update). Mirrors UpdateBusinessProfileDto.
export const UpdateBusinessProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  displayName: z.string().min(2).max(100).optional(),
  country: z.string().length(2).optional(),
  businessCategory: BusinessCategorySchema.optional(),
  state: z.string().min(2).max(64).optional(),
  lga: z.string().min(2).max(64).optional(),
  businessType: BusinessTypeSchema.optional(),
  approxClients: z.number().int().positive().max(100000).optional(),
  businessAddress: z.string().max(500).optional(),
  websiteUrl: z.string().url().optional(),
  socialHandles: z.string().optional(),
  rcNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
})
export type UpdateBusinessProfileRequest = z.infer<typeof UpdateBusinessProfileSchema>

// ── GET /advertiser/locations (auth-free reference data) ─────────────────────
export const NigerianStateSchema = z.object({
  name: z.string(),
  code: z.string(),
  zone: z.string(),
  lgas: z.array(z.string()),
})
export type NigerianState = z.infer<typeof NigerianStateSchema>
export const LocationsResponseSchema = z.object({ states: z.array(NigerianStateSchema) })

// ── KYC / verification ───────────────────────────────────────────────────────
export const KycStartResponseSchema = z.object({
  referenceId: z.string(),
  hostedUrl: z.string(),
  expiresAt: z.string(),
})
export type KycStartResponse = z.infer<typeof KycStartResponseSchema>

/** Permissive — the exact status payload firms up when we wire the widget. */
export const KycStatusResponseSchema = z
  .object({
    status: z.string().optional(),
    level: z.string().nullish(),
    isVerified: z.boolean().optional(),
  })
  .passthrough()
export type KycStatusResponse = z.infer<typeof KycStatusResponseSchema>

// ── POST /advertiser/org/invites/accept ──────────────────────────────────────
export const AcceptInviteSchema = z.object({ token: z.string().min(1) })
export const AcceptInviteResponseSchema = z.object({
  orgId: z.string(),
  role: z.string(),
})
export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>
