import { describe, it, expect } from 'vitest'
import { emptyWizard, stepValid, buildCreatePayload, type WizardState } from '../wizard'

function complete(): WizardState {
  return {
    name: 'Launch',
    objective: 'awareness',
    isWildcard: false,
    screenIds: ['11111111-1111-1111-1111-111111111111'],
    startDate: '2026-09-01',
    endDate: '2026-09-08',
    daysOfWeek: [1, 2, 3],
    hours: [9, 10, 18],
    budgetNaira: 2_000_000,
    dailyCapNaira: null,
    creativeId: '22222222-2222-2222-2222-222222222222',
  }
}

describe('stepValid', () => {
  it('gates each step on its own inputs', () => {
    const s = emptyWizard()
    expect(stepValid(s, 'objective')).toBe(false)
    s.name = 'Ad'
    s.objective = 'awareness'
    expect(stepValid(s, 'objective')).toBe(false) // name < 3 chars
    s.name = 'Big launch'
    expect(stepValid(s, 'objective')).toBe(true)

    expect(stepValid(s, 'screens')).toBe(false)
    s.isWildcard = true
    expect(stepValid(s, 'screens')).toBe(true)

    expect(stepValid(s, 'schedule')).toBe(false)
    s.startDate = '2026-09-01'
    s.endDate = '2026-08-01' // end before start
    expect(stepValid(s, 'schedule')).toBe(false)
    s.endDate = '2026-09-08'
    expect(stepValid(s, 'schedule')).toBe(true)

    expect(stepValid(s, 'budget')).toBe(false)
    s.budgetNaira = 5000
    expect(stepValid(s, 'budget')).toBe(true)

    expect(stepValid(s, 'creative')).toBe(false)
    s.creativeId = 'abc'
    expect(stepValid(s, 'creative')).toBe(true)
    expect(stepValid(s, 'review')).toBe(true)
  })
})

describe('buildCreatePayload', () => {
  it('builds a kobo-safe payload from a complete wizard', () => {
    const p = buildCreatePayload(complete())
    expect(p.budgetKobo).toBe('200000000') // ₦2,000,000 → integer kobo
    expect(p.objective).toBe('awareness')
    expect(p.isWildcard).toBe(false)
    expect(p.screenIds).toHaveLength(1)
    expect(p.targetDaysOfWeek).toEqual([1, 2, 3])
    expect(p.startDate).toContain('2026-09-01')
    expect(p.creativeId).toBe('22222222-2222-2222-2222-222222222222')
  })

  it('omits screenIds for wildcard and empty targeting arrays', () => {
    const w = complete()
    w.isWildcard = true
    w.daysOfWeek = []
    w.hours = []
    const p = buildCreatePayload(w)
    expect(p.screenIds).toBeUndefined()
    expect(p.targetDaysOfWeek).toBeUndefined()
    expect(p.targetHoursOfDay).toBeUndefined()
  })

  it('throws when the wizard is incomplete', () => {
    expect(() => buildCreatePayload(emptyWizard())).toThrow('incomplete')
  })
})
