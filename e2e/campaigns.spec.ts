import { test, expect, type Page } from '@playwright/test'

/**
 * Slice-4 e2e: the campaign wizard end-to-end (objective → wildcard screens →
 * schedule → budget+quote → pick seeded creative → submit → "In review"), plus
 * the list. Requires the seeded backend (agency org is KYC-ready and has a
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

  // 1 Objective
  await page.getByLabel('Campaign name').fill('E2E Wildcard Launch')
  await page.getByText('Awareness', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  // 2 Screens — wildcard
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Next' }).click()

  // 3 Schedule
  await page.getByLabel('Start date').fill(isoDay(2))
  await page.getByLabel('End date').fill(isoDay(9))
  await page.getByRole('button', { name: 'Next' }).click()

  // 4 Budget — live quote shows the net (kobo-safe)
  await page.getByLabel('Total budget (₦)').fill('100000')
  await expect(page.getByTestId('quote')).toContainText('₦')
  await page.getByRole('button', { name: 'Next' }).click()

  // 5 Creative — pick the seeded one
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Next' }).click()

  // 6 Review → submit
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}/)
  await expect(page.getByText('pending vetting')).toBeVisible()
})
