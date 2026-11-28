import type { Screen, MapFeatureCollection } from '@/api/contracts/screens'
import { formatKobo } from './money'

/** Flatten a GeoJSON FeatureCollection (from /screens/map) into uniform Screens. */
export function featuresToScreens(fc: MapFeatureCollection): Screen[] {
  return fc.features.map((f) => {
    const p = f.properties as Record<string, unknown>
    const [lng, lat] = f.geometry.coordinates
    return {
      id: String(p.id),
      name: String(p.name ?? ''),
      status: String(p.status ?? ''),
      lga: String(p.lga ?? ''),
      address: String(p.address ?? ''),
      venueType: String(p.venueType ?? ''),
      venueName: String(p.venueName ?? ''),
      estimatedDailyReach: typeof p.estimatedDailyReach === 'number' ? p.estimatedDailyReach : null,
      averageAttentionSeconds:
        typeof p.averageAttentionSeconds === 'number' ? p.averageAttentionSeconds : null,
      basePriceKobo: p.basePriceKobo == null ? null : String(p.basePriceKobo),
      latitude: lat,
      longitude: lng,
      photoUrl: p.photoUrl == null ? null : String(p.photoUrl),
      thumbnailUrl: p.thumbnailUrl == null ? null : String(p.thumbnailUrl),
    }
  })
}

/** Great-circle distance in kilometres between two lat/lng points. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export interface ClientFilters {
  /** Minimum estimated daily reach (footfall band lower bound). */
  minReach?: number
  maxReach?: number
  /** Base-price band, in kobo. */
  minPriceKobo?: number
  maxPriceKobo?: number
  /** Radius select: keep screens within `radiusKm` of `center`. */
  center?: { lat: number; lng: number }
  radiusKm?: number
}

/**
 * Client-side band + radius filtering (the server list endpoint supports only
 * lga/venueType/search/status — footfall/price bands and spatial selects are
 * done here on the loaded set).
 */
export function applyClientFilters(screens: Screen[], f: ClientFilters): Screen[] {
  return screens.filter((s) => {
    const reach = s.estimatedDailyReach ?? 0
    if (f.minReach != null && reach < f.minReach) return false
    if (f.maxReach != null && reach > f.maxReach) return false
    const price = s.basePriceKobo ? Number(s.basePriceKobo) : 0
    if (f.minPriceKobo != null && price < f.minPriceKobo) return false
    if (f.maxPriceKobo != null && price > f.maxPriceKobo) return false
    if (f.center && f.radiusKm != null && s.latitude != null && s.longitude != null) {
      if (haversineKm(f.center, { lat: s.latitude, lng: s.longitude }) > f.radiusKm) return false
    }
    return true
  })
}

/** Total estimated reach across a selection (sum of per-screen daily reach). */
export function totalReach(screens: Screen[]): number {
  return screens.reduce((sum, s) => sum + (s.estimatedDailyReach ?? 0), 0)
}

const CSV_COLUMNS = [
  'id',
  'name',
  'venueName',
  'venueType',
  'lga',
  'address',
  'status',
  'estimatedDailyReach',
  'basePriceNaira',
] as const

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV of the current (filtered) inventory. Money formatted from integer kobo. */
export function screensToCsv(screens: Screen[]): string {
  const header = CSV_COLUMNS.join(',')
  const rows = screens.map((s) =>
    [
      s.id,
      s.name,
      s.venueName,
      s.venueType,
      s.lga,
      s.address,
      s.status,
      s.estimatedDailyReach ?? '',
      s.basePriceKobo ? formatKobo(s.basePriceKobo, { symbol: false }) : '',
    ]
      .map(csvCell)
      .join(','),
  )
  return [header, ...rows].join('\n')
}
