import { env } from '@/env'
import { api } from './client'
import {
  MyOrgsResponseSchema,
  WorkspacesResponseSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  MembersResponseSchema,
  ChangeRoleSchema,
  WorkspaceSchema,
} from './contracts/org'
import type { MembershipRole } from './contracts/common'

// Org enumeration + switch targets
export function listMyOrgs() {
  return api.get('/advertiser/orgs', MyOrgsResponseSchema)
}
export function listWorkspaces() {
  return api.get('/advertiser/org/workspaces', WorkspacesResponseSchema)
}
export function createWorkspace(name: string) {
  return api.post('/advertiser/org/workspaces', CreateWorkspaceSchema.parse({ name }), WorkspaceSchema)
}
export function updateWorkspace(id: string, patch: { name?: string; status?: 'active' | 'suspended' | 'archived' }) {
  return api.patch(`/advertiser/org/workspaces/${id}`, UpdateWorkspaceSchema.parse(patch), WorkspaceSchema)
}

// Members
export function listMembers() {
  return api.get('/advertiser/org/members', MembersResponseSchema)
}
export function inviteMember(email: string, role: MembershipRole) {
  return api.post('/advertiser/org/invites', { email, role })
}
export function changeRole(userId: string, role: MembershipRole) {
  return api.patch(`/advertiser/org/members/${userId}`, ChangeRoleSchema.parse({ role }))
}
export function suspendMember(userId: string) {
  return api.post(`/advertiser/org/members/${userId}/suspend`, {})
}

// Reports
export function getOrgSummary(periodDays = 30) {
  return api.get(`/advertiser/reports/org/summary?period=${periodDays}`)
}
export function campaignExportUrl(campaignId: string, format: 'csv' | 'pdf'): string {
  return `${env.apiBaseUrl}/advertiser/reports/campaigns/${campaignId}/export?format=${format}`
}

// API keys
export function listApiKeys() {
  return api.get('/advertiser/api-keys')
}
export function createApiKey(name: string, scopes: string[]) {
  return api.post('/advertiser/api-keys', { name, scopes })
}
export function revokeApiKey(id: string) {
  return api.del(`/advertiser/api-keys/${id}`)
}
