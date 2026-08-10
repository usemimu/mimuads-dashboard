# Implementation Notes — Mimuads Console

## Contract strategy (why zod lives here, not in `@mimu/api-contract`)

`@mimu/api-contract` in the backend monorepo is the **device/player** contract only
(schedule/plays/health/host-fallback/screen-config) — it has no advertiser/console shapes. The
console-facing contracts live as Zod DTOs inside `apps/api/src/**/dto`, but `mimu-platform` is a
**separate repo**, so we don't cross-import them. Instead the console owns thin zod schemas under
`src/api/contracts/` and a CI **drift-check** (`src/api/__tests__/contracts.drift.spec.ts`) asserts
they match the backend's live `/openapi.json` (committed as `openapi.snapshot.json`). Refresh with:

```
OPENAPI_URL=http://localhost:8000/openapi.json pnpm contracts:sync
```

## Fast-follow API asks (COMMITTED — backend will implement)

These are wired in the console now behind `src/config/features.ts` flags; flip the flag when live.

1. **`GET /advertiser/orgs`** — list orgs/memberships for the current user (org-switcher enumeration).
   Until live, the switcher shows the current context only (from JWT claims). Flag: `listMyOrgs`.
2. **`GET /advertiser/org/workspaces`** — list workspaces in the current org (workspace switcher +
   Org admin). Flag: `listWorkspaces`.
3. **`POST /advertiser/org/workspaces`** — create a client workspace (agency Org admin, slice 6).
   Flag: `createWorkspace`.
4. **Typed error `code`** — the backend returns `{ statusCode, message }` with no machine code, so
   the console classifies errors by HTTP status and shows the backend's human message. A discriminant
   `code` (e.g. `INSUFFICIENT_BALANCE`, `TIER_CEILING_EXCEEDED`, `ISOLATION_DENIED`) would let the UI
   branch precisely without string-matching. `src/api/errors.ts` already reads `code` if present.
5. **International phone on signup** — backend `request-otp`/`verify-otp` restrict phone to `+234…`;
   the PRD signup wants a full country selector defaulting to +234. Slice 2 concern.
6. **First/last name + "position at company"** on signup — backend takes a single `name` and no
   position field; the PRD Page 1 splits first/last and adds an optional position select. Slice 2:
   compose `name` from first+last client-side; flag `position` as a backend gap (sales signal only).

## Auth response-shape notes

- `login-password` and `verify-otp` return **different `user` sub-shapes** (`login` →
  `isPhoneVerified`/`isEmailVerified`; `verify-otp` → `isNewUser`/`profileImageUrl`). Modelled
  separately in `src/api/contracts/auth.ts`; the store keeps only common fields (`SessionUser`).
- `login-password` has **no named response DTO** in the backend (its response isn't a `createZodDto`),
  so it isn't in `/openapi.json` components and can't be drift-checked. Fast-follow: give it a named
  response DTO (ideally the same one as `verify-otp`) so both are drift-covered.

## Security headers (set at the serving layer, not in-app)

The SPA ships static assets; the host/CDN must send: `Content-Security-Policy` (default-src 'self';
connect-src self + API origin + map tiles + Paystack; frame-ancestors 'none'), `Strict-Transport-
Security`, `X-Content-Type-Options: nosniff`. `index.html` carries a baseline `frame-ancestors 'none'`
meta as defense-in-depth.
