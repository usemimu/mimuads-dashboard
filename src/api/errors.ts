/**
 * Error normalization. The console maps the backend's errors to a discriminated
 * `ConsoleError` union so the UI can render a specific, human message per case
 * (PRD §5 error UX) instead of a raw code toast.
 *
 * The backend currently returns plain `{ statusCode, message, error }` with NO
 * machine-readable `code` (see docs/IMPLEMENTATION-NOTES.md — a typed `code` on
 * money/tier/isolation errors is a fast-follow). We therefore classify by HTTP
 * status and pass the backend's human message through verbatim — we NEVER invent
 * a number or a rule client-side. `code` is parsed opportunistically so that once
 * the backend adds it, downstream slices can branch on it without changes here.
 */

export type ConsoleErrorKind =
  | 'auth' // 401 — triggers silent refresh, then hard logout
  | 'forbidden' // 403 — role or context-isolation denial
  | 'not_found' // 404
  | 'validation' // 400 / 422 — shape or business validation (message is authoritative)
  | 'conflict' // 409 — e.g. duplicate / state conflict
  | 'rate_limited' // 429
  | 'server' // 5xx
  | 'network' // request never completed (offline, CORS, DNS)
  | 'unknown'

export interface ConsoleError {
  kind: ConsoleErrorKind
  status: number // 0 for network errors
  /** Human message from the backend (authoritative for tier/balance/vetting text). */
  message: string
  /** Machine code IF the backend supplied one (forward-compat; usually undefined today). */
  code?: string
  /** Field-level validation messages when present. */
  fields?: Record<string, string[]>
}

export class ApiError extends Error implements ConsoleError {
  kind: ConsoleErrorKind
  status: number
  code?: string
  fields?: Record<string, string[]>

  constructor(e: ConsoleError) {
    super(e.message)
    this.name = 'ApiError'
    this.kind = e.kind
    this.status = e.status
    this.code = e.code
    this.fields = e.fields
  }
}

function kindForStatus(status: number): ConsoleErrorKind {
  if (status === 401) return 'auth'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 422 || status === 400) return 'validation'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server'
  return 'unknown'
}

/** Normalize a non-OK HTTP response body into a ConsoleError. */
export function normalizeHttpError(status: number, body: unknown): ConsoleError {
  const b = (body ?? {}) as Record<string, unknown>
  const rawMessage = b.message ?? b.error
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(', ')
    : typeof rawMessage === 'string' && rawMessage.length > 0
      ? rawMessage
      : `Request failed (${status})`

  const fields =
    b.errors && typeof b.errors === 'object'
      ? (b.errors as Record<string, string[]>)
      : undefined

  return {
    kind: kindForStatus(status),
    status,
    message,
    code: typeof b.code === 'string' ? b.code : undefined,
    fields,
  }
}

/** Normalize a thrown fetch/network failure (request never reached a response). */
export function normalizeNetworkError(err: unknown): ConsoleError {
  return {
    kind: 'network',
    status: 0,
    message:
      err instanceof Error
        ? `Network error: ${err.message}`
        : 'Network error — could not reach the Mimuads API.',
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
