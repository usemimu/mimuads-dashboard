import { test, expect, type Page } from '@playwright/test'

/**
 * Slice-4 e2e: the X-style campaign wizard end-to-end. Four phases —
 * Pick objective → Define audience (wildcard screens + schedule + budget, with
 * the live Estimate rail) → Craft your ad (seeded creative) → Launch (submit) —
 * plus the list. Requires the seeded backend (agency org is KYC-ready and has a
 * ready_for_vetting creative; 8 demo screens).
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Phone or email').fill('agency@demo.usemimu.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

function isoDay(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400_000)
  return d.toISOString().slice(0, 10)
}

test('wizard: create + submit a wildcard campaign → In review', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Campaigns' }).click()
  await expect(page).toHaveURL(/\/campaigns/)
  await page.getByRole('button', { name: 'New campaign' }).click()
  await expect(page).toHaveURL(/\/campaigns\/new/)

  // Phase 1 · Pick objective
  await page.getByLabel('Campaign name').fill('E2E Wildcard Launch')
  await page.getByText('Awareness', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  // Phase 2 · Define audience — wildcard screens + schedule + budget on one page.
  await page.getByRole('checkbox').first().check() // run on all eligible screens
  await page.getByLabel('Start date').fill(isoDay(2))
  await page.getByLabel('End date').fill(isoDay(9))
  await page.getByLabel('Total budget (₦)').fill('100000')
  // The live Estimate rail prices the flight (kobo-safe).
  await expect(page.getByTestId('estimate')).toContainText('₦')
  await page.getByRole('button', { name: 'Next' }).click()

  // Phase 3 · Craft your ad — pick the seeded creative
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Next' }).click()

  // Phase 4 · Launch → submit
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}/)
  await expect(page.getByText('pending vetting')).toBeVisible()
})
