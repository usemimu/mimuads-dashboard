import { z } from 'zod'

/**
 * Shared enums + the access-token claim shape. These mirror the backend
 * (auth.types.ts / jwt.service.ts) and are drift-checked against /openapi.json.
 */

export const MembershipRoleSchema = z.enum([
  'owner',
  'admin',
  'finance',
  'campaign_manager',
  'viewer',
])
export type MembershipRole = z.infer<typeof MembershipRoleSchema>

export const OrgTierSchema = z.enum(['starter', 'business', 'agency', 'enterprise'])
export type OrgTier = z.infer<typeof OrgTierSchema>

export const OrgKindSchema = z.enum(['advertiser', 'agency'])
export type OrgKind = z.infer<typeof OrgKindSchema>

export const UserTypeSchema = z.enum(['advertiser', 'host'])
export type UserType = z.infer<typeof UserTypeSchema>

/**
 * Access-token payload the console decodes for the active context. Only the
 * org-context claims are load-bearing here; standard JWT fields are permitted
 * but not required.
 */
export const AccessClaimsSchema = z.object({
  sub: z.string(), // user id
  org: z.string().nullish(), // active org id (absent until an org exists)
  ws: z.string().nullish(), // active workspace id (agency) or null
  role: MembershipRoleSchema.nullish(),
  tier: OrgTierSchema.nullish(),
  exp: z.number().optional(),
  iat: z.number().optional(),
})
export type AccessClaims = z.infer<typeof AccessClaimsSchema>
