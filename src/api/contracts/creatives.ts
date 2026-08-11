import { z } from 'zod'

/**
 * Creative contracts (presigned upload flow). Mirror apps/api/src/creatives/dto;
 * response DTOs registered for drift-checking.
 */

export const CreativeFormatSchema = z.enum(['video', 'image'])
export const CreativeStatusSchema = z.enum([
  'uploading',
  'processing',
  'ready_for_vetting',
  'in_vetting',
  'approved',
  'rejected',
  'failed',
])

export const UploadIntentSchema = z.object({
  filename: z.string().min(1).max(255),
  name: z.string().min(1).max(255).optional(),
  format: CreativeFormatSchema,
  sizeBytes: z.number().int().min(1),
  durationSeconds: z.number().optional(),
  resolution: z.string().regex(/^\d+x\d+$/).optional(),
  contentType: z
    .enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
    .optional(),
})
export type UploadIntentRequest = z.infer<typeof UploadIntentSchema>

export const UploadIntentResponseSchema = z
  .object({
    creativeId: z.string(),
    presignedUrl: z.string(),
    presignedFields: z.record(z.string(), z.string()).optional(),
    expiresAt: z.string(),
    uploadInstructions: z.unknown(),
  })
  .passthrough()

export const ConfirmUploadSchema = z.object({ sha256Hash: z.string() })

export const CreativeStatusResponseSchema = z
  .object({
    id: z.string(),
    status: CreativeStatusSchema,
    name: z.string().nullable().optional(),
    filename: z.string(),
    format: CreativeFormatSchema,
    sizeBytes: z.string(),
    cdnUrl: z.string().nullable().optional(),
    previewUrl: z.string().nullable().optional(),
    posterUrl: z.string().nullable().optional(),
    vettingRejectionReason: z.string().nullable().optional(),
  })
  .passthrough()
export type CreativeStatus = z.infer<typeof CreativeStatusResponseSchema>

export const CreativeListResponseSchema = z
  .object({ creatives: z.array(CreativeStatusResponseSchema) })
  .passthrough()
