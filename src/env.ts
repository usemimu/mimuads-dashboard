/**
 * Env discipline (mirrors the mobile PRD §12): the console REQUIRES an explicit
 * `VITE_APP_ENV` and fails loudly — at build and at boot — if it's missing or
 * invalid. Every environment-derived value (API base, map tiles, Paystack key)
 * flows through here so nothing reads `import.meta.env` ad hoc.
 *
 * Only PUBLIC config lives here. No secrets ever reach the client bundle.
 */

export const APP_ENVS = ['dev', 'staging', 'production'] as const
export type AppEnv = (typeof APP_ENVS)[number]

function requireEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key]
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable ${key}. ` +
        `The Mimuads console will not run without it — set it in .env.<mode> ` +
        `(see .env.example).`,
    )
  }
  return value
}

function resolveAppEnv(): AppEnv {
  const raw = requireEnv('VITE_APP_ENV')
  if (!(APP_ENVS as readonly string[]).includes(raw)) {
    throw new Error(
      `[env] VITE_APP_ENV="${raw}" is invalid. Expected one of: ${APP_ENVS.join(', ')}.`,
    )
  }
  return raw as AppEnv
}

export interface Env {
  appEnv: AppEnv
  apiBaseUrl: string
  /** Google Maps JS API key. OPTIONAL — absent in dev/CI, where the map degrades
   *  to a graceful fallback; required in staging/production for the live map. */
  googleMapsApiKey: string | undefined
  paystackPublicKey: string
  isProduction: boolean
}

function buildEnv(): Env {
  const appEnv = resolveAppEnv()
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  return {
    appEnv,
    apiBaseUrl: requireEnv('VITE_API_BASE_URL').replace(/\/+$/, ''),
    googleMapsApiKey: mapsKey && mapsKey.length > 0 ? mapsKey : undefined,
    paystackPublicKey: requireEnv('VITE_PAYSTACK_PUBLIC_KEY'),
    isProduction: appEnv === 'production',
  }
}

/** Frozen, validated environment. Importing this module boots the checks. */
export const env: Env = Object.freeze(buildEnv())
