/**
 * Feature flags. The org-enumeration + workspace fast-follows shipped in the
 * backend (slice 6), so they're enabled. Flags remain as kill-switches / for
 * environments pointed at an older API.
 */
export const FEATURES = {
  /** GET /advertiser/orgs — org switcher enumeration. */
  listMyOrgs: true,
  /** GET /advertiser/org/workspaces — workspace switcher + org admin. */
  listWorkspaces: true,
  /** POST /advertiser/org/workspaces — create a workspace. */
  createWorkspace: true,
} as const

export type FeatureFlag = keyof typeof FEATURES

export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag]
}
