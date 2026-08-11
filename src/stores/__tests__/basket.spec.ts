import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBasket } from '../basket'
import type { Screen } from '@/api/contracts/screens'

const screen = (id: string, reach: number): Screen => ({
  id,
  name: id,
  status: 'active',
  lga: 'Ikeja',
  address: 'a',
  venueType: 'mall',
  venueName: 'V',
  estimatedDailyReach: reach,
  averageAttentionSeconds: 5,
  basePriceKobo: '1000000',
})

describe('basket store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('toggles selection and tracks count + estimated reach', () => {
    const b = useBasket()
    b.toggle(screen('a', 1000))
    b.toggle(screen('b', 2500))
    expect(b.count).toBe(2)
    expect(b.reach).toBe(3500)
    expect(b.ids).toEqual(['a', 'b'])
    b.toggle(screen('a', 1000)) // deselect
    expect(b.count).toBe(1)
    expect(b.has('a')).toBe(false)
  })

  it('addMany is idempotent by id', () => {
    const b = useBasket()
    b.addMany([screen('a', 1), screen('a', 1), screen('b', 1)])
    expect(b.count).toBe(2)
  })

  it('saves + deletes named sets (persisted to localStorage)', () => {
    const b = useBasket()
    b.add(screen('a', 1))
    b.saveSet('Lagos malls')
    expect(b.savedSets).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('mimu.screenSets')!)[0].name).toBe('Lagos malls')
    b.deleteSet('Lagos malls')
    expect(b.savedSets).toHaveLength(0)
  })

  it('will not save an empty selection or unnamed set', () => {
    const b = useBasket()
    b.saveSet('empty')
    expect(b.savedSets).toHaveLength(0)
  })
})
