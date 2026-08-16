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

/** Generic `{ message }` ack returned by mutation endpoints. */
export const MessageResponseSchema = z.object({ message: z.string() })

// ── PATCH /advertiser/auth/change-password ───────────────────────────────────
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>

// ── DELETE /advertiser/profile (soft delete + session revoke) ────────────────
export const DeleteAccountSchema = z.object({
  reason: z.string().max(500).optional(),
})
export type DeleteAccountRequest = z.infer<typeof DeleteAccountSchema>

// ── POST /advertiser/profile/image/upload-url ────────────────────────────────
export const ProfileImageUploadSchema = z.object({
  fileExtension: z.enum(['jpg', 'jpeg', 'png', 'webp']),
})
export type ProfileImageUploadRequest = z.infer<typeof ProfileImageUploadSchema>

/**
 * Presigned upload response (shared `PresignedUploadUrl` shape). `fileUrl` is
 * the canonical URL to persist via the confirm call; `headers` (when present)
 * must be echoed on the S3 PUT so the signature matches.
 */
export const ProfileImageUploadResponseSchema = z.object({
  uploadUrl: z.string(),
  fileUrl: z.string(),
  key: z.string().optional(),
  bucket: z.string().optional(),
  expiresIn: z.number().optional(),
  headers: z.record(z.string(), z.string()).optional(),
})
export type ProfileImageUploadResponse = z.infer<typeof ProfileImageUploadResponseSchema>

// ── PATCH /advertiser/profile/image ──────────────────────────────────────────
export const ConfirmProfileImageSchema = z.object({
  imageUrl: z.string().url(),
})
export type ConfirmProfileImageRequest = z.infer<typeof ConfirmProfileImageSchema>
