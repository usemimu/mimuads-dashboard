/**
 * Console API contracts — the console's self-owned, drift-checked source of truth
 * (see docs/IMPLEMENTATION-NOTES.md for why they live here and not in a shared
 * package). `contracts.drift.spec.ts` asserts these match the backend's live
 * /openapi.json so they can never silently diverge.
 */
export * from './common'
export * from './auth'
export * from './profile'
export * from './org'
