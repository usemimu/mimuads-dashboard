import { z } from 'zod'

/**
 * Carousel contracts. Mirror apps/api/src/creatives/dto/carousel.dto.ts +
 * carousel.controller.ts. A carousel is one creative made of ordered
 * image/video frames; the campaign references the carouselId as its creativeId.
 */

export const CAROUSEL_MIN_ITEMS = 2
export const CAROUSEL_MAX_ITEMS = 6
export const CAROUSEL_MAX_TOTAL_SECONDS = 30
export const CAROUSEL_MIN_DWELL_SECONDS = 3

export const CreateCarouselResponseSchema = z.object({ carouselId: z.string() }).passthrough()

export const CarouselItemUploadIntentResponseSchema = z
  .object({
    itemId: z.string(),
    sequence: z.number(),
    presignedUrl: z.string(),
    expiresAt: z.string(),
    uploadInstructions: z.unknown(),
    posterUpload: z
      .object({ presignedUrl: z.string(), headers: z.record(z.string(), z.string()).optional() })
      .optional(),
  })
  .passthrough()

export const ConfirmCarouselResponseSchema = z
  .object({ carouselId: z.string(), status: z.string() })
  .passthrough()

export const CarouselItemSchema = z
  .object({
    id: z.string(),
    sequence: z.number(),
    format: z.enum(['image', 'video']),
    dwellSeconds: z.number(),
    filename: z.string(),
    cdnUrl: z.string().nullable().optional(),
  })
  .passthrough()

export const GetCarouselResponseSchema = z
  .object({
    carousel: z.object({ id: z.string(), status: z.string() }).passthrough(),
    items: z.array(CarouselItemSchema),
  })
  .passthrough()
