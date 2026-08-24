/**
 * Canonical screen taxonomy — mirrors the mimu-admin vocabulary
 * (`src/lib/venueTypes.js` + the LGA list in `Screens.vue`) so the advertiser
 * console's "All LGAs" / "All venue types" filters offer exactly the options
 * ops uses when creating screens. Keep these in lock-step with the admin.
 */

export const VENUE_TYPES = [
  'pharmacy',
  'salon',
  'restaurant',
  'eatery',
  'supermarket',
  'electronics',
  'fashion',
  'fitness',
  'clinic',
  'other',
] as const

export const LAGOS_LGAS = [
  'Agege',
  'Ajeromi-Ifelodun',
  'Alimosho',
  'Amuwo-Odofin',
  'Apapa',
  'Badagry',
  'Epe',
  'Eti-Osa',
  'Ibeju-Lekki',
  'Ifako-Ijaiye',
  'Ikeja',
  'Ikorodu',
  'Kosofe',
  'Lagos Island',
  'Lagos Mainland',
  'Mushin',
  'Ojo',
  'Oshodi-Isolo',
  'Shomolu',
  'Surulere',
] as const

/**
 * Merge a canonical vocabulary with whatever distinct values actually appear in
 * the loaded screens — so every canonical option is always offered, and any
 * legacy/seed value not in the canon (e.g. `market`, `mall`, `fuel_station`)
 * stays filterable rather than orphaning those screens. Canonical order first,
 * extras appended alphabetically.
 */
export function mergeOptions(canonical: readonly string[], present: Iterable<string>): string[] {
  const set = new Set(canonical)
  const extras = [...new Set(present)].filter((v) => v && !set.has(v)).sort()
  return [...canonical, ...extras]
}
