import { z } from 'zod'
import { UserTypeSchema } from './common'

/**
 * GET /advertiser/profile — current user + business/org profile. Slice 1 uses it
 * to render identity in the shell; the active org context itself comes from the
 * decoded access token (org/ws/role/tier claims), not this payload.
 */
export const ProfileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    userType: UserTypeSchema,
    name: z.string().nullable(),
    email: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    profileImageUrl: z.string().nullable(),
    theme: z.string(),
  }),
  // The org/business profile object; shape stabilizes in later slices, so kept
  // permissive here and validated where consumed.
  profile: z.unknown().nullable(),
})
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>
