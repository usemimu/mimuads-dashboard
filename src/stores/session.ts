import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { getProfile } from '@/api/profile'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/api/token'
import { resetQueryCacheForContextSwitch } from '@/api/query'
import { decodeAccessClaims } from '@/lib/jwt'
import type { MembershipRole, OrgTier } from '@/api/contracts/common'
import {
  AuthTokensResponseSchema,
  PasswordLoginResponseSchema,
  PasswordLoginSchema,
  RefreshTokenResponseSchema,
  SwitchContextResponseSchema,
  VerifyOtpSchema,
  type SessionUser,
} from '@/api/contracts/auth'

export interface ActiveContext {
  userId: string | null
  orgId: string | null
  workspaceId: string | null
  role: MembershipRole | null
  tier: OrgTier | null
}

const EMPTY_CONTEXT: ActiveContext = {
  userId: null,
  orgId: null,
  workspaceId: null,
  role: null,
  tier: null,
}

/**
 * Auth + active-context store. Holds the in-memory access token's decoded claims;
 * mutations that change context swap the token AND purge the query cache so no
 * prior-context data leaks. Nothing here is persisted to browser storage.
 */
export const useSession = defineStore('session', () => {
  const context = ref<ActiveContext>({ ...EMPTY_CONTEXT })
  const user = ref<SessionUser | null>(null)
  const bootstrapped = ref(false)

  const isAuthenticated = computed(() => context.value.userId !== null)
  const hasOrg = computed(() => context.value.orgId !== null)
  const role = computed(() => context.value.role)
  /** Viewers get no mutation affordances (cosmetic mirror of backend enforcement). */
  const canMutate = computed(() => role.value !== null && role.value !== 'viewer')
  const canManageBilling = computed(
    () => role.value === 'owner' || role.value === 'admin' || role.value === 'finance',
  )
  const canSubmitCampaign = computed(
    () =>
      role.value === 'owner' || role.value === 'admin' || role.value === 'campaign_manager',
  )

  function applyToken(accessToken: string): void {
    setAccessToken(accessToken)
    const claims = decodeAccessClaims(accessToken)
    context.value = {
      userId: claims?.sub ?? null,
      orgId: claims?.org ?? null,
      workspaceId: claims?.ws ?? null,
      role: claims?.role ?? null,
      tier: claims?.tier ?? null,
    }
  }

  function clearSession(): void {
    clearAccessToken()
    context.value = { ...EMPTY_CONTEXT }
    user.value = null
    resetQueryCacheForContextSwitch()
  }

  function toSessionUser(u: {
    id: string
    name: string | null
    email: string | null
    phoneNumber: string
  }): SessionUser {
    return { id: u.id, name: u.name, email: u.email, phoneNumber: u.phoneNumber }
  }

  async function loginWithPassword(phoneOrEmail: string, password: string): Promise<void> {
    const body = PasswordLoginSchema.parse({ phoneOrEmail, password })
    const res = await api.post(
      '/advertiser/auth/login-password',
      body,
      PasswordLoginResponseSchema,
    )
    user.value = toSessionUser(res.user)
    applyToken(res.accessToken)
  }

  async function verifyOtp(phone: string, code: string): Promise<void> {
    const body = VerifyOtpSchema.parse({ phone, code })
    const res = await api.post('/advertiser/auth/verify-otp', body, AuthTokensResponseSchema)
    user.value = toSessionUser(res.user)
    applyToken(res.accessToken)
  }

  async function switchOrg(orgId: string): Promise<void> {
    const res = await api.post(
      '/advertiser/auth/switch-org',
      { orgId },
      SwitchContextResponseSchema,
    )
    resetQueryCacheForContextSwitch()
    applyToken(res.accessToken)
  }

  async function switchWorkspace(orgId: string, workspaceId: string): Promise<void> {
    const res = await api.post(
      '/advertiser/auth/switch-workspace',
      { orgId, workspaceId },
      SwitchContextResponseSchema,
    )
    resetQueryCacheForContextSwitch()
    applyToken(res.accessToken)
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/advertiser/auth/logout', {})
    } catch {
      /* best-effort; clear locally regardless */
    }
    clearSession()
  }

  /**
   * Re-issue the access token from the refresh cookie. Used after org creation
   * (the pre-org token has org=null; refresh re-resolves the org/role/tier claims)
   * and on app load. Returns whether a session was (re)established.
   */
  async function refreshSession(): Promise<boolean> {
    try {
      const res = await api.post('/advertiser/auth/refresh', {}, RefreshTokenResponseSchema)
      if (res.accessToken) {
        applyToken(res.accessToken)
        // The token has no name/email — hydrate the display user so a
        // page refresh shows the person, not their raw id. Best-effort:
        // a failure here shouldn't drop an otherwise-valid session.
        await loadUser()
        return true
      }
    } catch {
      clearAccessToken()
    }
    return false
  }

  /**
   * Populate `user` from GET /advertiser/profile. Called after a silent
   * refresh (page reload / org creation), where the auth response that
   * normally seeds `user` on login isn't in play.
   */
  async function loadUser(): Promise<void> {
    try {
      const res = await getProfile()
      user.value = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phoneNumber: res.user.phoneNumber ?? '',
        profileImageUrl: res.user.profileImageUrl,
      }
    } catch {
      /* non-fatal — shell falls back to context.userId */
    }
  }

  /**
   * On app load, try a silent refresh from the httpOnly cookie so a returning
   * user lands authenticated without re-login. Failure is normal (logged out).
   */
  async function bootstrap(): Promise<void> {
    await refreshSession()
    bootstrapped.value = true
  }

  return {
    context,
    user,
    bootstrapped,
    isAuthenticated,
    hasOrg,
    role,
    canMutate,
    canManageBilling,
    canSubmitCampaign,
    hasToken: () => getAccessToken() !== null,
    loginWithPassword,
    verifyOtp,
    switchOrg,
    switchWorkspace,
    logout,
    bootstrap,
    refreshSession,
    loadUser,
    clearSession,
  }
})
