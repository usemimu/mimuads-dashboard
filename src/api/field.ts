import { api } from './client'
import {
  FieldCampaignSchema,
  FieldCampaignOrNullSchema,
  HeatmapSchema,
  TopScoutsSchema,
  CreateFieldCampaignSchema,
  type CreateFieldCampaignRequest,
} from './contracts/field'
import {
  FieldTaskSchema,
  FieldTasksSchema,
  TaskCompletionsSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from './contracts/field-tasks'

export function getFieldCampaign(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/field`, FieldCampaignOrNullSchema)
}

export function createFieldCampaign(campaignId: string, data: CreateFieldCampaignRequest) {
  return api.post(
    `/advertiser/campaigns/${campaignId}/field`,
    CreateFieldCampaignSchema.parse(data),
    FieldCampaignSchema,
  )
}

export function getSpreadHeatmap(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/field/heatmap`, HeatmapSchema)
}

export function getTopScouts(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/field/scouts`, TopScoutsSchema)
}

export function updateFieldStatus(campaignId: string, id: string, status: string) {
  return api.patch(
    `/advertiser/campaigns/${campaignId}/field/status`,
    { id, status },
    FieldCampaignSchema,
  )
}

// ── Field campaign tasks ──────────────────────────────────────────────────

export function listFieldTasks(campaignId: string) {
  return api.get(`/advertiser/campaigns/${campaignId}/field/tasks`, FieldTasksSchema)
}

export function createFieldTask(campaignId: string, data: CreateTaskInput) {
  return api.post(`/advertiser/campaigns/${campaignId}/field/tasks`, data, FieldTaskSchema)
}

export function updateFieldTask(campaignId: string, taskId: string, data: UpdateTaskInput) {
  return api.patch(
    `/advertiser/campaigns/${campaignId}/field/tasks/${taskId}`,
    data,
    FieldTaskSchema,
  )
}

export function deleteFieldTask(campaignId: string, taskId: string) {
  return api.del(`/advertiser/campaigns/${campaignId}/field/tasks/${taskId}`)
}

export function listTaskCompletions(campaignId: string, taskId: string) {
  return api.get(
    `/advertiser/campaigns/${campaignId}/field/tasks/${taskId}/completions`,
    TaskCompletionsSchema,
  )
}

export function reviewTaskCompletion(
  campaignId: string,
  taskId: string,
  completionId: string,
  decision: 'approved' | 'rejected',
  reviewNote?: string,
) {
  return api.patch(
    `/advertiser/campaigns/${campaignId}/field/tasks/${taskId}/completions/${completionId}`,
    { decision, reviewNote },
  )
}
