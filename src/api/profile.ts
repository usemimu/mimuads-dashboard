import { api } from './client'
import {
  ProfileResponseSchema,
  MessageResponseSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
  ProfileImageUploadSchema,
  ProfileImageUploadResponseSchema,
  ConfirmProfileImageSchema,
  type ProfileImageUploadResponse,
} from './contracts/profile'
import {
  BusinessProfileResponseSchema,
  UpdateBusinessProfileSchema,
  type UpdateBusinessProfileRequest,
} from './contracts/onboarding'

/**
 * GET /advertiser/profile — the current user (name/email/phone/avatar/theme)
 * plus their business/org profile. The access token only carries identity +
 * context claims (no name/email), so the shell must call this to render who's
 * signed in; otherwise it falls back to the raw user id.
 */
export function getProfile() {
  return api.get('/advertiser/profile', ProfileResponseSchema)
}

// ── Password ─────────────────────────────────────────────────────────────────

/** PATCH /advertiser/auth/change-password. Server enforces strength rules. */
export function changePassword(currentPassword: string, newPassword: string) {
  return api.patch(
    '/advertiser/auth/change-password',
    ChangePasswordSchema.parse({ currentPassword, newPassword }),
    MessageResponseSchema,
  )
}

// ── Business profile ─────────────────────────────────────────────────────────

/** GET /advertiser/business-profile — the org's public-facing business profile. */
export function getBusinessProfile() {
  return api.get('/advertiser/business-profile', BusinessProfileResponseSchema)
}

/** PATCH /advertiser/business-profile — partial update; returns the new profile. */
export function updateBusinessProfile(patch: UpdateBusinessProfileRequest) {
  return api.patch(
    '/advertiser/business-profile',
    UpdateBusinessProfileSchema.parse(patch),
    BusinessProfileResponseSchema,
  )
}

// ── Avatar (personal profile image) ──────────────────────────────────────────

/** POST /advertiser/profile/image/upload-url — mint a presigned S3 PUT URL. */
export function requestAvatarUploadUrl(fileExtension: string) {
  return api.post(
    '/advertiser/profile/image/upload-url',
    ProfileImageUploadSchema.parse({ fileExtension }),
    ProfileImageUploadResponseSchema,
  )
}

/**
 * PUT the file bytes straight to S3/R2 via the presigned URL. Uses a bare
 * `fetch` (no auth header / audience prefix). The backend presigns with
 * `image/jpeg`, so echo the returned `headers` when present, else send that
 * Content-Type so the signature matches.
 */
export async function uploadAvatarToPresigned(
  intent: ProfileImageUploadResponse,
  file: File,
): Promise<void> {
  const headers: Record<string, string> =
    intent.headers && Object.keys(intent.headers).length
      ? { ...intent.headers }
      : { 'Content-Type': 'image/jpeg' }
  const res = await fetch(intent.uploadUrl, { method: 'PUT', body: file, headers })
  if (!res.ok) throw new Error(`Avatar upload failed (${res.status})`)
}

/** PATCH /advertiser/profile/image — persist the uploaded avatar's URL. */
export function confirmAvatar(imageUrl: string) {
  return api.patch(
    '/advertiser/profile/image',
    ConfirmProfileImageSchema.parse({ imageUrl }),
    MessageResponseSchema,
  )
}

/** DELETE /advertiser/profile/image — remove the avatar. */
export function deleteAvatar() {
  return api.del('/advertiser/profile/image', undefined, MessageResponseSchema)
}

// ── Account deletion ─────────────────────────────────────────────────────────

/**
 * DELETE /advertiser/profile — soft-deletes the account and revokes all
 * sessions server-side. The caller MUST clear local tokens + redirect to login
 * afterwards (the token is now dead).
 */
export function deleteAccount(reason?: string) {
  return api.del(
    '/advertiser/profile',
    DeleteAccountSchema.parse(reason ? { reason } : {}),
    MessageResponseSchema,
  )
}
