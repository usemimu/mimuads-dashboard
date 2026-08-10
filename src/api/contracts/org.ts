import { z } from 'zod'
import { MembershipRoleSchema, OrgKindSchema, OrgTierSchema } from './common'

/**
 * COMMITTED backend fast-follows (not live yet — see docs/IMPLEMENTATION-NOTES.md
 * and src/config/features.ts). These contracts are authored now so the switcher
 * and org-admin wiring is a drop-in once the endpoints ship. They are NOT part of
 * the drift snapshot until the backend exposes them.
 */

/** GET /advertiser/orgs — orgs/memberships the current user belongs to. */
export const MyOrgSchema = z.object({
  orgId: z.string(),
  displayName: z.string(),
  kind: OrgKindSchema,
  tier: OrgTierSchema,
  role: MembershipRoleSchema,
})
export type MyOrg = z.infer<typeof MyOrgSchema>
export const MyOrgsResponseSchema = z.object({ orgs: z.array(MyOrgSchema) })

/** GET /advertiser/org/workspaces — workspaces in the current (agency) org. */
export const WorkspaceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  status: z.enum(['active', 'suspended', 'archived']),
})
export type Workspace = z.infer<typeof WorkspaceSchema>
export const WorkspacesResponseSchema = z.object({ workspaces: z.array(WorkspaceSchema) })

/** POST /advertiser/org/workspaces — create a client workspace. */
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(120),
})
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceSchema>
