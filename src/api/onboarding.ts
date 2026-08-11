/**
 * Onboarding API calls (signup, org creation, verification, invites, password
 * recovery). Thin wrappers over the typed client + contracts. No business logic —
 * the backend owns all rules; these only shape requests and validate responses.
 */
import { api } from './client'
import {
  RequestOtpSchema,
  RequestOtpResponseSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type RequestOtpRequest,
} from './contracts/auth'
import {
  CreateBusinessProfileSchema,
  BusinessProfileResponseSchema,
  LocationsResponseSchema,
  KycStartResponseSchema,
  KycStatusResponseSchema,
  AcceptInviteResponseSchema,
  type CreateBusinessProfileRequest,
  type NigerianState,
} from './contracts/onboarding'

/** Request an OTP. Pass `signup` to create the user at verify time. */
export function requestOtp(input: RequestOtpRequest) {
  const body = RequestOtpSchema.parse(input)
  return api.post('/advertiser/auth/request-otp', body, RequestOtpResponseSchema)
}

/** Reference data for the state/LGA selects (auth-free). */
export async function getStates(): Promise<NigerianState[]> {
  const res = await api.get('/advertiser/locations', LocationsResponseSchema)
  return res.states
}

/** Create the org (advertiser/agency) — the "create business profile" call. */
export function createBusinessProfile(input: CreateBusinessProfileRequest) {
  const body = CreateBusinessProfileSchema.parse(input)
  return api.post('/advertiser/business-profile', body, BusinessProfileResponseSchema)
}

/** Start a Dojah KYC session; returns the hosted-widget URL + reference. */
export function startKyc() {
  return api.post('/advertiser/kyc/start', {}, KycStartResponseSchema)
}

/** Poll verification status. */
export function getKycStatus() {
  return api.get('/advertiser/kyc/status', KycStatusResponseSchema)
}

/** Accept an org invite for the signed-in user. */
export function acceptInvite(token: string) {
  return api.post('/advertiser/org/invites/accept', { token }, AcceptInviteResponseSchema)
}

export function forgotPassword(phoneOrEmail: string) {
  return api.post('/advertiser/auth/forgot-password', ForgotPasswordSchema.parse({ phoneOrEmail }))
}

export function resetPassword(token: string, newPassword: string) {
  return api.post('/advertiser/auth/reset-password', ResetPasswordSchema.parse({ token, newPassword }))
}
