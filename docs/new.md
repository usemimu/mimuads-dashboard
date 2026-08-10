# Mimuads Ads Web Console — PRD (`apps/ads-web`)

**Product:** ads.usemimu.com — the desktop buying surface for advertisers and agencies.
**Repo location:** `mimu/` monorepo, new app `apps/ads-web`, importing `@mimu/api-contract` (and nothing else from the backend).
**Depends on:** Backend Platform PRD (Organizations, Tiers, Billing & Web-Console Support) — workstreams A, B, C1–C2, E must exist; D may trail.
**Audience:** A senior engineer (or Claude Code) implementing from scratch.
**Status:** To be implemented. No production users exist yet — no legacy constraints; get the foundations right.

---

## 1. What this is, in one paragraph

The console is a **thin desktop client of the same API the mobile app uses.** It exists because categories 2 (corporate growth teams) and 5 (agencies) buy media on desktops: bulk screen selection on a map, multi-campaign oversight, team roles, client sub-accounts (workspaces), invoices, and client-ready report exports. It introduces **no business logic of its own** — every rule (limits, pricing, eligibility, statuses) comes from the API. If the console ever needs an `if` that the backend doesn't enforce, that `if` belongs in the backend.

**Category coverage:** 3 (SMBs who prefer desktop) get the same self-serve flow as mobile, wide. 2 gets zone/bulk buying, reporting, API-key management. 5 gets workspaces, roles, invoicing, branded exports. 1 is served either directly (enterprise org) or through a category-5 agency's workspace — no bespoke UI.

---

## 2. Stack & repo decisions (fixed — do not relitigate in implementation)

- **Next.js (App Router) + TypeScript**, deployed at `ads.usemimu.com` (staging: match the existing staging-host convention used by host./ops.).
- **Types/contracts:** import request/response schemas from `@mimu/api-contract` directly. No hand-written API types, no OpenAPI codegen step — the monorepo package *is* the contract. A thin typed `apiClient` wrapper handles base URL, auth header, CSRF token, error normalization (map the API's typed errors to UI states).
- **Server state:** TanStack Query (cache keys namespaced by `orgId:workspaceId` — switching context must never leak cached data across orgs/workspaces). Client state: keep it minimal; no global store unless a concrete need appears.
- **Auth transport:** httpOnly refresh cookie (set by API), access token in memory only; silent refresh on 401 once, then hard logout. CSRF double-submit header on all mutations. Never persist tokens to localStorage/sessionStorage.
- **Map:** MapLibre GL (open-source, no vendor lock) rendering the existing `GET /screens/map` GeoJSON.
- **UI kit:** Tailwind + a headless component library; brand per the mobile design language — Cormorant (display), Plus Jakarta Sans (body), JetBrains Mono (numbers/money), Phosphor icons. Money always in ₦ with kobo-safe formatting from integer minor units (never float math in the client).
- **Env discipline:** the app requires an `APP_ENV` (dev/staging/production) at build/deploy and fails loudly without it — same rule the mobile PRD §12 enforces. API base URL, map tiles URL, Paystack public context all derive from env.
- **CI/CD:** PR preview deploys; `main` → staging; tagged release → production. Playwright e2e for the critical paths in §7.

---

## 3. Information architecture

Top-level shell (left sidebar + org/workspace switcher in the header):

1. **Dashboard** — org-level snapshot: wallet balance(s), active campaigns, spend this period, verified views, alerts (low balance, rejected creatives, pending invoices).
2. **Campaigns** — list (status pills matching the platform state machine), detail, and the create wizard.
3. **Screens** — the map-first inventory browser.
4. **Reports** — cross-campaign reporting + exports.
5. **Billing** — wallet, transactions, top-ups, transfers, invoices.
6. **Organization** — members & roles, workspaces (agency kind only), verification status, API keys (when backend D ships).
7. **Settings** — profile, notifications, security (password, sessions).

**Context model (the load-bearing UX concept):** the header always shows *who you are acting as* — `Org` or `Org / Workspace`. Agencies switch workspace to act for a client; every page below the switcher is scoped to that context via `POST /auth/switch-*` re-issued tokens. Deep links carry context (`/w/{workspaceSlug}/campaigns/...`) so shared URLs land in the right client. A wrong-context mutation must be impossible, not just hidden.

---

## 4. Feature specifications

### 4.1 Auth & onboarding — explicit screen-by-screen build spec

**Build this flow literally.** It is modeled on a proven self-serve ads-portal signup (Chowdeck's `grow` portal): a create-account page first, then an organization page, then contextual verification. Signup is a **single flow with a fork at org creation** — never separate signup URLs/forms per audience. Website CTAs land on `/signup?src=...` (source tracked for funnel analytics); `?src=agencies` may pre-select the agency card on the Organization page but must not skip it. Every screen below carries a **"Have an account? Log in"** link. Screens are single-column, centered, no horizontal scroll; a slim progress indicator (Account → Organization → Verify) sits above the form. Layout/spacing is the builder's judgment within the brand tokens (§2); the **fields, order, required/optional flags, and page breaks below are exact and must be reproduced as written.**

#### Page 1 — Create account (`/signup`)
Heading: "Create an account". Subheading: "Personal information". Creates a **user only** — no org yet. Fields, in this order:

| Field | Required | Notes |
|---|---|---|
| First name | ✔ | |
| Last name | ✔ | |
| Email address | ✔ | validated format; used for OTP |
| Phone number | ✔ | international country-code selector, **default +234 (Nigeria)**, full country list; store E.164 |
| Position at company | ✖ (optional) | select: CEO/Founder, CMO/Head of Marketing, Marketing Manager, Brand Manager, Digital Marketing Manager, Media Buyer, Growth Manager, Product Manager, Operations Manager, Other — **sales signal only, gates nothing** |
| Password | ✔ | strength meter; backend policy is the source of truth for rules |
| Confirm password | ✔ | must match (shape validation, client-side ok) |

Primary button: **"Next"**. On submit → create user via existing signup endpoint → advance to Page 2 (OTP). The router gate keeps the app shell unreachable until an org exists (Page 3), mirroring mobile's onboarding-pending state.

#### Page 2 — Verify it's you (OTP)
Heading: "Verify your email" (or phone, per channel used). Six-digit OTP input (auto-advance, paste-friendly), resend-with-cooldown, "wrong address? go back". Uses the existing `request-otp → verify-otp` endpoints. On success → session established via cookie transport → advance to Page 3.

#### Page 3 — Set up your organization (`/signup/organization`)
Heading: "How will you use Mimuads?". **Two selectable cards, not a dropdown** (this is the category fork):

- **Card A — "I'm advertising my own business"** → org kind `advertiser`. On select, reveal fields: business/legal name*, display name (optional), country* (default NG), business category* (select). Primary button **"Create organization"** → lands in the console on the starter tier; verification deferred (Page 4).
- **Card B — "I'm an agency booking for clients"** → org kind `agency`. On select, reveal fields: agency legal name*, display name (optional), country* (default NG), approx. number of clients (optional — sizing signal). Primary button **"Create agency account"** → because agency orgs require `kyb_enhanced` (ops-involved), the org is created in a **pending-verification state**; org creation fires an internal notification (email/Slack via existing notification infra) so ops/sales reach out same-day.

#### Page 4 — Verification (contextual; never a hard wall in front of browsing)
After org creation the user reaches the console shell immediately and can browse (screens, map, pricing/quotes, demo report). Verification is demanded **at the moment of intent** — funding a wallet or submitting a campaign — not at the front door.
- **Advertiser orgs:** persistent banner "Complete verification to launch campaigns" → launches the **Dojah hosted widget in-page** (web equivalent of mobile KYB, org-scoped); status polled.
- **Agency orgs:** an enhanced-verification status/checklist view reflecting ops-side approval (`admin/orgs/:id/enhanced-verification`), with document-upload slots if ops requests them; workspaces, funding, and campaign submission stay locked until approved, with the pending screen stating an expected turnaround.
- A **Verification hub** in Settings shows the current level (`kyc_individual / kyb_standard / kyb_enhanced`) and upgrade paths.

#### Invite path (`/invite/{token}`) — bypasses Page 3 entirely
Will become the highest-volume entry for agency users (one admin signs up, then invites colleagues/clients). Validate the `org_invites` token → show **Page 1 + Page 2 only** (or plain login if the email already has an account) → activate membership with the assigned role → land directly inside the inviting org (and workspace context if the invite is workspace-scoped). Never show the org-creation page on this path. Expired/consumed tokens show a clear recovery screen ("ask your admin to re-send").

#### Sign-in & recovery
Login (email/phone + OTP or password) and forgot/reset password — same endpoints as mobile, cookie transport, silent-refresh session behavior per §2. Role-aware UI throughout: viewers see no mutation controls; finance sees Billing fully but cannot submit campaigns — enforcement is backend, the UI merely mirrors it.

> **Note for the builder:** if any field above maps to a property not present in the `@mimu/api-contract` signup/org schemas, STOP and flag it as a backend gap (per the working method) rather than inventing the field client-side.

### 4.2 Screens — map-first inventory (the console's marquee feature)
- Full-viewport MapLibre map of screens from `GET /screens/map`; clustered markers; color by online/offline.
- Filter rail: LGA, venue type, footfall band, base-price band, search (server-side search endpoint exists).
- **Bulk selection:** click-to-add, **draw-polygon / radius select**, and select-by-LGA. Selection persists in a "screen basket" (count + estimated reach) that can be sent into the campaign wizard or saved as a **named screen set** (client-side saved lists in v1; per-org persistence is a fast-follow API ask, noted in §8).
- Screen detail drawer: venue, address, hourly footfall curve (chart), base price, live/offline state — parity with mobile detail.
- Split view list⇄map toggle with CSV export of the current filtered inventory (agencies paste this into plans).

### 4.3 Campaign wizard — same five steps, desktop-wide
Mirrors the platform model exactly (objective → screens → schedule → budget → creative → review):
- **Objective:** the three plain-language objectives, unchanged.
- **Screens:** embedded map/list from 4.2, plus **Wildcard** with copy explaining affinity placement; agencies see the workspace context banner ("Booking for {Client}").
- **Schedule:** date range, days-of-week, dayparts — with a visual week/hour grid.
- **Budget:** daily cap or total; live quote via `GET /screens/quote` showing `{gross, volume discount, net}` per the org's tier schedule; tier ceilings surfaced as inline validation using the API's typed errors (never hard-code limits client-side).
- **Creative:** presigned upload (upload-intent → PUT → confirm), preview player, vetting-status explainer (ARCON review before going live; use **ARCON** naming everywhere in copy).
- **Review & submit:** full summary; submit runs the backend's validation chain; drafts auto-save via PATCH so a browser crash loses nothing.
- Post-submit: status page with the review → approved → live pipeline visualized.

### 4.4 Campaigns list & detail
- List: filter by status/workspace/date; bulk actions limited to pause/resume (backend endpoints exist).
- Detail: status timeline, spend vs budget pacing chart, performance tabs (overall / by-screen / by-hour / by-day from the existing performance endpoints), **decision-factor transparency panel** (from `GET /reports/campaigns/:id/decision-factors`) explaining pacing/fairness/diversity effects — this is the answer to "why is my big campaign pacing like this," rendered as plain-language factor bars, not jargon.
- Actions: pause, resume, top-up budget, extend, clone (all existing endpoints).

### 4.5 Reports & exports
- Cross-campaign table with period picker; org rollup for agencies (per-workspace columns) from `GET /reports/org/summary`.
- Per-campaign **Export CSV / Export PDF** — the PDF is the client-ready artifact the public agencies page promises (verified impressions, reach by LGA, peak-time performance); rendered server-side, downloaded here. On agency tiers the export carries the workspace/client name in the header.

### 4.6 Billing
- Wallet card(s): org master + per-workspace balances; transactions with filters + CSV (existing export, extended).
- **Top-up (Paystack):** intent → redirect to hosted checkout → return URL → verify → success state. Register the console return/callback URLs in Paystack config before launch.
- **Transfers:** org ↔ workspace movement with confirmation modal showing resulting balances (finance/admin roles).
- **Invoices:** request invoice (amount, target wallet, purpose) → issued invoice with number, VAT line, bank details, downloadable PDF → status tracks `issued → payment received → credited` as ops confirm; low-friction copy explains the bank-transfer flow. This screen is the entire category-2/5 finance unlock — treat it as first-class, not an afterthought.

### 4.7 Organization admin
- **Members:** list, invite (email + role), change role, suspend — mirrors backend role matrix; owner-only for destructive actions.
- **Workspaces (agency orgs):** create client workspace, rename, archive; per-workspace wallet summary; jump-to-workspace.
- **Verification:** status + upgrade paths (standard → enhanced request routes to ops).
- **API keys (when backend D lands):** create scoped key (shown once), list, revoke, last-used; docs link.

### 4.8 Dashboard
Assembled from endpoints above; no bespoke analytics endpoints in v1. Cards: balance + low-balance warning, campaigns by status, 7-day verified views sparkline, pending items (creatives in review, invoices awaiting payment), and for agencies a per-workspace strip.

---

## 5. Non-functional requirements

- **Security:** CSP (self + API + map tiles + Paystack), HSTS, frame-ancestors 'none'; no tokens in storage; CSRF on all mutations; dependency audit in CI. The console moves money — hold it to the mobile app's §12 bar.
- **Performance:** map interactive <2s on broadband with 5k screens (cluster server-side if needed later — note as API ask, don't hack client-side); route-level code splitting; TanStack Query caching with context-scoped keys.
- **Accessibility:** keyboard-complete wizard and tables; WCAG AA contrast within the brand palette.
- **Error UX:** every typed API error (tier ceiling, insufficient balance, vetting rejection, isolation violations) maps to a specific, human message — never a raw toast of the error code.
- **i18n-readiness:** copy in a message catalog from day one (en-NG default); no user-facing strings inline. Cheap now, expensive later — this is the Africa-expansion concession, nothing more.
- **Analytics:** page + funnel events for wizard steps and signup (mirrors the mobile PRD's success metrics: wizard drop-off, time-to-first-live, top-up success), behind a thin wrapper so the vendor is swappable.

---

## 6. Explicit non-goals (v1)

**Platform-wide non-goals (rejected for this cycle, on purpose — shared with the Backend Platform PRD §9):**
- Programmatic/OpenRTB SSP, DSP integrations, white-label tenancy (roadmap; org model is the only prep).
- Automated credit lines / net-terms billing (schema-ready only).
- Multi-currency ledger operations (fields exist; NGN-only flows).
- Large-format inventory aggregation (commercial, not backend, work).
- SSO/SAML for enterprise users (password+OTP+TOTP-capable users suffice pre-users).

**Console-specific non-goals (v1):**
- Creative design/editing tools; programmatic/DSP UI; white-label theming; multi-currency display; a marketing site (usemimu.com stays separate — but its CTAs switch to `ads.usemimu.com/signup?src=...` at launch); host or ops functionality (separate apps); saved-audience server persistence (client-side only in v1, see §8).

---

## 7. Acceptance criteria / e2e paths (Playwright, run in CI against seeded staging)
1. **SMB path:** sign up → create advertiser org → complete KYB (mocked Dojah) → top up via Paystack test mode → wizard end-to-end with map selection → submit → campaign shows "In review".
2. **Agency path:** agency org (seeded enhanced-verified) → create workspace → request invoice → (ops confirms in seeded backend) → workspace wallet credited → transfer → submit ₦2M workspace campaign (passes tier policy) → export client PDF; verify the PDF totals equal the on-screen performance numbers.
3. **Roles:** viewer cannot mutate anything (UI + API both enforce); finance can invoice but not submit campaigns.
4. **Isolation:** switching workspace fully swaps data; a deep link to another workspace's campaign under the wrong context is denied, and no cached data from the previous context is displayed.
5. **Env discipline:** build without `APP_ENV` fails; staging build points at staging API.

## 8. Fast-follow API asks (tracked, not blockers)
Server-persisted saved screen sets per org; server-side marker clustering above ~5k screens; report scheduling (email a PDF weekly); workspace-level notification routing.