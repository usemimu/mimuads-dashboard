import { api } from './client'
import {
  ScreenListQuerySchema,
  ScreenListResponseSchema,
  ScreenDetailSchema,
  MapFeatureCollectionSchema,
  type ScreenListQuery,
} from './contracts/screens'
import { featuresToScreens } from '@/lib/screens'

function qs(query: ScreenListQuery): string {
  const parsed = ScreenListQuerySchema.parse(query)
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined && v !== '') params.set(k, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function listScreens(query: ScreenListQuery = {}) {
  return api.get(`/advertiser/screens${qs(query)}`, ScreenListResponseSchema)
}

/** Map inventory (GeoJSON) flattened into uniform Screens. */
export async function getScreensMap(query: ScreenListQuery = {}) {
  const fc = await api.get(`/advertiser/screens/map${qs(query)}`, MapFeatureCollectionSchema)
  return featuresToScreens(fc)
}

export function getScreen(id: string) {
  return api.get(`/advertiser/screens/${id}`, ScreenDetailSchema)
}
