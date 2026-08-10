/**
 * In-memory access-token holder. The token lives ONLY here (module memory) — never
 * localStorage/sessionStorage (PRD §2). The httpOnly `mimu_refresh` cookie is the
 * durable half and is invisible to JS by design.
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}
export function setAccessToken(token: string | null): void {
  accessToken = token
}
export function clearAccessToken(): void {
  accessToken = null
}
