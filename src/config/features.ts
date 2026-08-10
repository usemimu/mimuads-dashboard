/**
 * Feature flags for COMMITTED backend fast-follows that aren't live yet. The
 * console builds the wiring (contracts + query/mutation hooks + UI) now and
 * gates it here, so each feature is a drop-in flip once the endpoint ships —
 * not a rebuild. See docs/IMPLEMENTATION-NOTES.md.
 */
export const FEATURES = {
  /** GET list of orgs/memberships the current user belongs to (org switcher enumeration). */
  listMyOrgs: false,
  /** GET list of workspaces in the current org (workspace switcher enumeration + org admin). */
  listWorkspaces: false,
  /** POST create a workspace (agency org admin). */
  createWorkspace: false,
} as const

export type FeatureFlag = keyof typeof FEATURES

export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag]
}
