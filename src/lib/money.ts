/**
 * Money is ALWAYS integer minor units (kobo) on the wire. The client formats
 * for display only and NEVER does float arithmetic on money — no parseFloat on
 * naira, no client-side price math. Amounts arrive as `number` (safe integer)
 * or `string` (bigint-as-string, which the ledger uses for large values).
 *
 * 100 kobo = ₦1.
 */

const KOBO_PER_NAIRA = 100n

function toKoboBigInt(kobo: number | string | bigint): bigint {
  if (typeof kobo === 'bigint') return kobo
  if (typeof kobo === 'string') {
    if (!/^-?\d+$/.test(kobo)) {
      throw new Error(`[money] invalid kobo string: "${kobo}"`)
    }
    return BigInt(kobo)
  }
  if (!Number.isInteger(kobo)) {
    throw new Error(`[money] kobo must be an integer, got ${kobo}`)
  }
  return BigInt(kobo)
}

/**
 * Format an integer kobo amount as Nigerian naira, e.g. 200000000 → "₦2,000,000.00".
 * Pure integer/BigInt math — the fractional part is derived by division, never floats.
 */
export function formatKobo(
  kobo: number | string | bigint,
  opts: { showDecimals?: boolean; symbol?: boolean } = {},
): string {
  const { showDecimals = true, symbol = true } = opts
  const value = toKoboBigInt(kobo)
  const negative = value < 0n
  const abs = negative ? -value : value

  const naira = abs / KOBO_PER_NAIRA
  const remainder = abs % KOBO_PER_NAIRA

  const nairaStr = naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimals = showDecimals ? '.' + remainder.toString().padStart(2, '0') : ''

  return `${negative ? '-' : ''}${symbol ? '₦' : ''}${nairaStr}${decimals}`
}

/** Naira (whole) → integer kobo, for building request payloads from a numeric field. */
export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira)) throw new Error('[money] naira must be finite')
  // Round to avoid binary-float dust before converting to integer minor units.
  return Math.round(naira * 100)
}
