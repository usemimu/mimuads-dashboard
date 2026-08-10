import { describe, it, expect } from 'vitest'
import { formatKobo, nairaToKobo } from '../money'

describe('formatKobo', () => {
  it('formats integer kobo as naira with grouping + decimals', () => {
    expect(formatKobo(200000000)).toBe('₦2,000,000.00')
    expect(formatKobo(150000)).toBe('₦1,500.00')
    expect(formatKobo(0)).toBe('₦0.00')
    expect(formatKobo(99)).toBe('₦0.99')
    expect(formatKobo(1)).toBe('₦0.01')
  })

  it('handles bigint-as-string amounts (ledger scale) without float math', () => {
    expect(formatKobo('900719925474099100')).toBe('₦9,007,199,254,740,991.00')
  })

  it('supports negatives and option toggles', () => {
    expect(formatKobo(-250000)).toBe('-₦2,500.00')
    expect(formatKobo(200000000, { showDecimals: false })).toBe('₦2,000,000')
    expect(formatKobo(150000, { symbol: false })).toBe('1,500.00')
  })

  it('rejects non-integer kobo (guards against float leakage)', () => {
    expect(() => formatKobo(12.5)).toThrow('money')
    expect(() => formatKobo('12.5')).toThrow('money')
  })
})

describe('nairaToKobo', () => {
  it('converts whole/decimal naira to integer kobo', () => {
    expect(nairaToKobo(2_000_000)).toBe(200000000)
    expect(nairaToKobo(1500.5)).toBe(150050)
  })
})
