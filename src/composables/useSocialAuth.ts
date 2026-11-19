/**
 * Thin wrappers around the Google Identity Services (GIS) and Apple Sign In
 * JS SDKs. Both SDKs are loaded lazily on first call so they don't affect
 * the initial bundle size or parse cost.
 *
 * Usage: call initGoogle(callback) on mount, then googleSignIn() on button
 * click. For Apple call appleSignIn() directly (no init step needed).
 */
import { env } from '@/env'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

// ── Google Identity Services ──────────────────────────────────────────────────

type GisCredentialResponse = { credential: string }

let gisReady = false

export async function initGoogle(onCredential: (idToken: string) => void): Promise<boolean> {
  if (!env.googleAuthClientId) return false
  await loadScript('https://accounts.google.com/gsi/client')
  // @ts-ignore
  window.google.accounts.id.initialize({
    client_id: env.googleAuthClientId,
    callback: (res: GisCredentialResponse) => onCredential(res.credential),
    // Disable FedCM so the traditional One Tap overlay fires from our button click.
    use_fedcm_for_prompt: false,
    auto_select: false,
  })
  gisReady = true
  return true
}

/** Trigger the Google account picker. Call this on button click after initGoogle(). */
export function googleSignIn(): void {
  if (!gisReady) return
  // @ts-ignore
  window.google.accounts.id.prompt()
}

// ── Apple Sign In ─────────────────────────────────────────────────────────────

type AppleAuthResult = {
  authorization: { id_token: string }
  user?: { name?: { firstName?: string; lastName?: string }; email?: string }
}

export async function appleSignIn(): Promise<{ identityToken: string; name?: string } | null> {
  if (!env.appleClientId) return null
  await loadScript(
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
  )
  // @ts-ignore
  AppleID.auth.init({
    clientId: env.appleClientId,
    scope: 'name email',
    redirectURI: window.location.origin,
    usePopup: true,
  })
  // @ts-ignore
  const data: AppleAuthResult = await AppleID.auth.signIn()
  const idToken = data.authorization?.id_token
  if (!idToken) return null
  const { firstName, lastName } = data.user?.name ?? {}
  const name = [firstName, lastName].filter(Boolean).join(' ') || undefined
  return { identityToken: idToken, name }
}
