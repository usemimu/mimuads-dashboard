import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  applyClientFilters,
  totalReach,
  screensToCsv,
  featuresToScreens,
} from '../screens'
import type { Screen, MapFeatureCollection } from '@/api/contracts/screens'

function mk(p: Partial<Screen>): Screen {
  return {
    id: 'x',
    name: 'S',
    status: 'active',
    lga: 'Ikeja',
    address: 'addr',
    venueType: 'mall',
    venueName: 'V',
    estimatedDailyReach: 1000,
    averageAttentionSeconds: 5,
    basePriceKobo: '1000000',
    latitude: 6.6,
    longitude: 3.35,
    ...p,
  }
}

describe('haversineKm', () => {
  it('is ~0 for identical points and grows with distance', () => {
    expect(haversineKm({ lat: 6.6, lng: 3.35 }, { lat: 6.6, lng: 3.35 })).toBeCloseTo(0, 5)
    // Ikeja → Lekki is roughly ~20km
    const d = haversineKm({ lat: 6.6018, lng: 3.3515 }, { lat: 6.4392, lng: 3.4527 })
    expect(d).toBeGreaterThan(15)
    expect(d).toBeLessThan(30)
  })
})

describe('applyClientFilters', () => {
  const screens = [
    mk({ id: 'a', estimatedDailyReach: 500, basePriceKobo: '500000', latitude: 6.6, longitude: 3.35 }),
    mk({ id: 'b', estimatedDailyReach: 5000, basePriceKobo: '3000000', latitude: 6.44, longitude: 3.45 }),
  ]
  it('filters by footfall band', () => {
    expect(applyClientFilters(screens, { minReach: 1000 }).map((s) => s.id)).toEqual(['b'])
  })
  it('filters by price band (kobo)', () => {
    expect(applyClientFilters(screens, { maxPriceKobo: 1000000 }).map((s) => s.id)).toEqual(['a'])
  })
  it('filters by radius around a center', () => {
    const r = applyClientFilters(screens, { center: { lat: 6.6, lng: 3.35 }, radiusKm: 5 })
    expect(r.map((s) => s.id)).toEqual(['a'])
  })
})

describe('totalReach', () => {
  it('sums estimated daily reach, treating null as 0', () => {
    expect(totalReach([mk({ estimatedDailyReach: 100 }), mk({ estimatedDailyReach: null })])).toBe(100)
  })
})

describe('screensToCsv', () => {
  it('emits a header + kobo-safe naira price + escapes commas', () => {
    const csv = screensToCsv([mk({ name: 'Mall, Ikeja', basePriceKobo: '2500000' })])
    const [header, row] = csv.split('\n')
    expect(header).toContain('basePriceNaira')
    expect(row).toContain('"Mall, Ikeja"') // comma-escaped
    expect(row).toContain('25,000.00') // formatted from integer kobo, no symbol
  })
})

describe('featuresToScreens', () => {
  it('flattens GeoJSON [lng,lat] into lat/lng Screens', () => {
    const fc: MapFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [3.3515, 6.6018] },
          properties: { id: 's1', name: 'A', status: 'active', lga: 'Ikeja', venueType: 'mall', venueName: 'V', estimatedDailyReach: 4200, basePriceKobo: '2500000' },
        },
      ],
    }
    const s = featuresToScreens(fc)[0]!
    expect(s.id).toBe('s1')
    expect(s.latitude).toBeCloseTo(6.6018)
    expect(s.longitude).toBeCloseTo(3.3515)
    expect(s.estimatedDailyReach).toBe(4200)
  })
})
