/**
 * CSRF double-submit token store.
 *
 * Unlike the access token (memory-only), this is persisted to localStorage so it
 * survives a page refresh — the client needs it to authorise the first
 * `/auth/refresh` after reload. It is NOT a bearer secret: it's the same value
 * the API also sets in the readable `mimu_csrf` cookie and that we echo in
 * `X-CSRF-Token` for the double-submit check. Persisting it decouples the
 * console from having to read that cookie across the app/ads subdomains (which
 * fails unless the cookie is scoped to `.usemimu.com`).
 */
const KEY = 'mimu_csrf'

export function getCsrfToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setCsrfToken(token: string | null | undefined): void {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable (private mode / SSR) — fall back to the cookie */
  }
}

export function clearCsrfToken(): void {
  setCsrfToken(null)
}
