/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  /** dev | staging | production — REQUIRED; the app fails loudly without it. */
  readonly VITE_APP_ENV?: string
  /** Backend API origin, e.g. https://api.staging.usemimu.com */
  readonly VITE_API_BASE_URL?: string
  /** Google Maps JS API key (optional in dev/CI). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /** Paystack public key (publishable; not a secret). */
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
