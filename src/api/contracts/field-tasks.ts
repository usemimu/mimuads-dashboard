import { z } from 'zod'

export const TaskProofTypeSchema = z.enum(['none', 'photo', 'gps', 'screenshot'])
export type TaskProofType = z.infer<typeof TaskProofTypeSchema>

export const FieldTaskSchema = z.object({
  id: z.string().uuid(),
  fieldCampaignId: z.string().uuid(),
  orgId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  proofType: TaskProofTypeSchema,
  payoutKobo: z.number().int(),
  maxCompletions: z.number().int().nullable(),
  completionCount: z.number().int(),
  targetLat: z.number().nullable(),
  targetLng: z.number().nullable(),
  targetRadiusMetres: z.number().int(),
  deadline: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type FieldTask = z.infer<typeof FieldTaskSchema>

export const FieldTasksSchema = z.array(FieldTaskSchema)

export const TaskCompletionScoutSchema = z.object({
  displayName: z.string(),
  email: z.string(),
})

export const TaskCompletionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected']),
  earnedKobo: z.number().int(),
  proofUrl: z.string().nullable(),
  proofLat: z.number().nullable(),
  proofLng: z.number().nullable(),
  proofMetadata: z.unknown().nullable(),
  rejectionReason: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  scout: TaskCompletionScoutSchema,
})
export type TaskCompletion = z.infer<typeof TaskCompletionSchema>

export const TaskCompletionsSchema = z.array(TaskCompletionSchema)

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  proofType: TaskProofTypeSchema,
  payoutKobo: z.number().int().min(0),
  maxCompletions: z.number().int().positive().nullable(),
  targetLat: z.number().nullable(),
  targetLng: z.number().nullable(),
  targetRadiusMetres: z.number().int().positive(),
  deadline: z.string().nullable(),
})
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>

export const UpdateTaskInputSchema = CreateTaskInputSchema.partial().extend({
  isActive: z.boolean().optional(),
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>
