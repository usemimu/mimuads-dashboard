import { describe, it, expect } from 'vitest'
import { normalizeHttpError, normalizeNetworkError } from '../errors'

describe('normalizeHttpError', () => {
  it('classifies by HTTP status into the ConsoleError union', () => {
    expect(normalizeHttpError(401, { message: 'no' }).kind).toBe('auth')
    expect(normalizeHttpError(403, { message: 'nope' }).kind).toBe('forbidden')
    expect(normalizeHttpError(404, {}).kind).toBe('not_found')
    expect(normalizeHttpError(409, {}).kind).toBe('conflict')
    expect(normalizeHttpError(400, {}).kind).toBe('validation')
    expect(normalizeHttpError(422, {}).kind).toBe('validation')
    expect(normalizeHttpError(429, {}).kind).toBe('rate_limited')
    expect(normalizeHttpError(500, {}).kind).toBe('server')
  })

  it('passes the backend human message through verbatim (never invents copy)', () => {
    const e = normalizeHttpError(400, { message: 'Insufficient balance. Required: ₦2,000,000' })
    expect(e.message).toBe('Insufficient balance. Required: ₦2,000,000')
  })

  it('joins array validation messages', () => {
    expect(normalizeHttpError(400, { message: ['a required', 'b required'] }).message).toBe(
      'a required, b required',
    )
  })

  it('captures a machine code when the backend supplies one (forward-compat)', () => {
    expect(normalizeHttpError(409, { code: 'TIER_CEILING', message: 'x' }).code).toBe('TIER_CEILING')
    expect(normalizeHttpError(409, { message: 'x' }).code).toBeUndefined()
  })
})

describe('normalizeNetworkError', () => {
  it('maps a thrown fetch failure to a network ConsoleError', () => {
    const e = normalizeNetworkError(new Error('Failed to fetch'))
    expect(e.kind).toBe('network')
    expect(e.status).toBe(0)
  })
})
