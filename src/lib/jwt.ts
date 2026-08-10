import { AccessClaimsSchema, type AccessClaims } from '@/api/contracts/common'

/**
 * Decode (NOT verify) the access-token payload to read the active org context.
 * The token is server-signed and used as a Bearer credential; the console only
 * reads its claims for UI context — the backend remains the security authority.
 */
export function decodeAccessClaims(token: string | null): AccessClaims | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payloadB64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(payloadB64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    const parsed = AccessClaimsSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
