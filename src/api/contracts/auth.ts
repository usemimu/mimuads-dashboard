import { z } from 'zod'
import { UserTypeSchema } from './common'

/**
 * Auth contracts consumed by slice 1 (login/OTP/refresh/switch). Field names and
 * types mirror apps/api/src/auth/advertiser/dto/* and are drift-checked against
 * /openapi.json (see contracts.drift.spec.ts).
 *
 * Under cookie transport the refresh token is delivered via the httpOnly
 * `mimu_refresh` cookie, so response `refreshToken` is an empty string — the
 * console never reads it.
 */

// ── Password login: POST /advertiser/auth/login-password ────────────────────
export const PasswordLoginSchema = z.object({
  phoneOrEmail: z.string().min(1),
  password: z.string().min(8),
})
export type PasswordLoginRequest = z.infer<typeof PasswordLoginSchema>

// Note: login-password and verify-otp return DIFFERENT `user` sub-shapes
// (login → isPhoneVerified/isEmailVerified; verify-otp → isNewUser/
// profileImageUrl), so they are modelled separately. The store keeps only the
// common display fields (SessionUser).
const PasswordLoginUserSchema = z.object({
  id: z.string(),
  userType: UserTypeSchema,
  phoneNumber: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  isPhoneVerified: z.boolean(),
  isEmailVerified: z.boolean(),
})

export const PasswordLoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: PasswordLoginUserSchema,
})
export type PasswordLoginResponse = z.infer<typeof PasswordLoginResponseSchema>

const VerifyOtpUserSchema = z.object({
  id: z.string(),
  userType: UserTypeSchema,
  phoneNumber: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  isNewUser: z.boolean(),
  profileImageUrl: z.string().nullable(),
})

/** verify-otp token-issuing response. */
export const AuthTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: VerifyOtpUserSchema,
})
export type AuthTokensResponse = z.infer<typeof AuthTokensResponseSchema>

/** Minimal user kept in the session store; satisfied by both auth responses. */
export interface SessionUser {
  id: string
  name: string | null
  email: string | null
  phoneNumber: string
}

// ── Request OTP: POST /advertiser/auth/request-otp ──────────────────────────
export const SignupPayloadSchema = z.object({
  password: z.string().min(8),
  name: z.string().min(2).max(255),
  // "Position at company" — optional sales signal (Page 1). Gates nothing.
  position: z.string().max(120).optional(),
})

export const RequestOtpSchema = z.object({
  phone: z.string().regex(/^\+234\d{10}$/),
  email: z.string().email().optional(),
  signup: SignupPayloadSchema.optional(),
})
export type RequestOtpRequest = z.infer<typeof RequestOtpSchema>

export const RequestOtpResponseSchema = z.object({
  message: z.string(),
  expiresAt: z.string(),
  expiresIn: z.number().int().positive(),
})

// ── Verify OTP: POST /advertiser/auth/verify-otp ────────────────────────────
export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^\+234\d{10}$/),
  code: z.string().length(6).regex(/^\d{6}$/),
})
export type VerifyOtpRequest = z.infer<typeof VerifyOtpSchema>

// ── Refresh: POST /advertiser/auth/refresh (cookie transport → empty body) ──
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
})

// ── Switch context: POST /advertiser/auth/switch-org | switch-workspace ─────
export const SwitchOrgSchema = z.object({
  orgId: z.string().uuid(),
})
export const SwitchWorkspaceSchema = z.object({
  orgId: z.string().uuid(),
  workspaceId: z.string().uuid(),
})
export const SwitchContextResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
})
export type SwitchContextResponse = z.infer<typeof SwitchContextResponseSchema>

// ── Forgot / reset password ─────────────────────────────────────────────────
export const ForgotPasswordSchema = z.object({
  phoneOrEmail: z.string().min(1),
})
export const ResetPasswordSchema = z.object({
  // The 6-digit reset code emitted by forgot-password (backend calls it `token`).
  token: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8),
})
