import { z } from 'zod'

/**
 * Screens (inventory) contracts. Mirror apps/api/src/campaigns/dto/screen.dto.ts.
 * The console consumes a subset of ScreenResponseDto (drift-checked); the map
 * endpoint returns an inline GeoJSON FeatureCollection (not a named component),
 * so it's modelled permissively and flattened into the same Screen shape.
 *
 * Backend notes (see docs/IMPLEMENTATION-NOTES.md): `status` is config-state
 * (active/offline/…), not a live heartbeat; there is no server-side footfall- or
 * price-band filter (done client-side); `hourlyTraffic` isn't populated (we draw
 * the footfall curve from `peakHours`).
 */

// GET /advertiser/screens query
export const ScreenListQuerySchema = z.object({
  lga: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  venueType: z.string().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
})
export type ScreenListQuery = z.infer<typeof ScreenListQuerySchema>

/** Uniform screen shape used by list + map (map features are flattened into it). */
export const ScreenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    lga: z.string(),
    address: z.string(),
    venueType: z.string(),
    venueName: z.string(),
    estimatedDailyReach: z.number().nullable(),
    averageAttentionSeconds: z.number().nullable(),
    peakHours: z.array(z.number()).nullable().optional(),
    basePriceKobo: z.string().nullable(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    thumbnailUrl: z.string().nullable().optional(),
  })
  .passthrough()
export type Screen = z.infer<typeof ScreenSchema>

export const ScreenListResponseSchema = z.object({
  screens: z.array(ScreenSchema),
  pagination: z
    .object({ limit: z.number(), offset: z.number(), total: z.number(), hasMore: z.boolean() })
    .optional(),
})

export const ScreenDetailSchema = ScreenSchema.extend({
  hourlyTraffic: z
    .array(z.object({ hour: z.number(), averageViewers: z.number() }))
    .nullable()
    .optional(),
})
export type ScreenDetail = z.infer<typeof ScreenDetailSchema>

// GeoJSON from GET /advertiser/screens/map (inline, permissive).
export const MapFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.record(z.string(), z.unknown()),
})
export const MapFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(MapFeatureSchema),
})
export type MapFeatureCollection = z.infer<typeof MapFeatureCollectionSchema>

/** True when a screen should render/behave as "online". */
export function isOnline(status: string): boolean {
  return status === 'active'
}
