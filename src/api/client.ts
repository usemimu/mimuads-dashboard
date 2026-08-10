/**
 * The one thin API client. Owns: base URL, auth header, cookie transport, CSRF
 * double-submit on mutations, typed-error normalization, and a single silent
 * refresh on 401 (then hard logout). Every request in the app goes through here.
 */
import { z } from 'zod'
import { env } from '@/env'
import { getAccessToken, setAccessToken } from './token'
import {
  ApiError,
  normalizeHttpError,
  normalizeNetworkError,
  type ConsoleError,
} from './errors'
import { RefreshTokenResponseSchema } from './contracts/auth'

const CSRF_COOKIE = 'mimu_csrf'
const REFRESH_PATH = '/advertiser/auth/refresh'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RequestOptions<T> {
  method?: Method
  body?: unknown
  /** Zod schema to validate + type the response (recommended for all reads). */
  schema?: z.ZodType<T>
  /** Send Authorization header (default true). */
  auth?: boolean
  /** Skip the silent-refresh retry (used internally by the refresh call). */
  noRefresh?: boolean
  signal?: AbortSignal
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]!) : null
}

function isMutation(method: Method): boolean {
  return method !== 'GET'
}

// Called when refresh fails — the app registers a hard-logout handler.
let onAuthFailure: () => void = () => {}
export function registerAuthFailureHandler(fn: () => void): void {
  onAuthFailure = fn
}

// Single-flight refresh so concurrent 401s don't stampede the refresh endpoint.
let refreshInFlight: Promise<boolean> | null = null

async function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(env.apiBaseUrl + REFRESH_PATH, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Transport': 'cookie',
          },
          body: '{}',
        })
        if (!res.ok) return false
        const json = await res.json()
        const parsed = RefreshTokenResponseSchema.safeParse(json)
        if (!parsed.success || !parsed.data.accessToken) return false
        setAccessToken(parsed.data.accessToken)
        return true
      } catch {
        return false
      } finally {
        // Reset after this microtask settles so the next 401 can refresh again.
        queueMicrotask(() => (refreshInFlight = null))
      }
    })()
  }
  return refreshInFlight
}

async function parseError(res: Response): Promise<ConsoleError> {
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON error body */
  }
  return normalizeHttpError(res.status, body)
}

async function doFetch(path: string, opts: RequestOptions<unknown>): Promise<Response> {
  const method = opts.method ?? 'GET'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Auth-Transport': 'cookie',
  }

  if (opts.auth !== false) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  if (isMutation(method)) {
    const csrf = readCookie(CSRF_COOKIE)
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  return fetch(env.apiBaseUrl + path, {
    method,
    credentials: 'include',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  })
}

/** Core typed request. Throws `ApiError` (a normalized ConsoleError) on failure. */
export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions<T> = {},
): Promise<T> {
  let res: Response
  try {
    res = await doFetch(path, opts)
  } catch (err) {
    throw new ApiError(normalizeNetworkError(err))
  }

  // Silent refresh once on 401, then retry; else hard logout.
  if (res.status === 401 && !opts.noRefresh && path !== REFRESH_PATH) {
    const refreshed = await refreshOnce()
    if (refreshed) {
      try {
        res = await doFetch(path, opts)
      } catch (err) {
        throw new ApiError(normalizeNetworkError(err))
      }
    }
    if (res.status === 401) {
      onAuthFailure()
      throw new ApiError(normalizeHttpError(401, await safeJson(res)))
    }
  }

  if (!res.ok) throw new ApiError(await parseError(res))

  if (res.status === 204) return undefined as T
  const json = await res.json()
  if (opts.schema) {
    const parsed = opts.schema.safeParse(json)
    if (!parsed.success) {
      throw new ApiError({
        kind: 'unknown',
        status: res.status,
        message: `Response shape mismatch for ${path}: ${parsed.error.message}`,
      })
    }
    return parsed.data
  }
  return json as T
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

// Ergonomic verbs.
export const api = {
  get: <T>(path: string, schema?: z.ZodType<T>, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: 'GET', schema, signal }),
  post: <T>(path: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiFetch<T>(path, { method: 'POST', body, schema }),
  patch: <T>(path: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiFetch<T>(path, { method: 'PATCH', body, schema }),
  del: <T>(path: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiFetch<T>(path, { method: 'DELETE', body, schema }),
}
