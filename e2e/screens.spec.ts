import { test, expect } from '@playwright/test'

/**
 * Slice-3 e2e. The map needs a Google Maps key (absent in CI → graceful
 * fallback), so this drives the list view + basket + CSV, and asserts the map
 * fallback renders. Requires the seeded backend on :8000 (8 demo Lagos screens).
 */

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Phone or email').fill('agency@demo.usemimu.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('screens: map fallback, list inventory, basket selection, CSV export', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Screens' }).click()
  await expect(page).toHaveURL(/\/screens/)

  // Map view (no Maps key in CI) → graceful fallback.
  await expect(page.getByTestId('map-fallback')).toBeVisible()

  // Seeded inventory (8 demo Lagos screens).
  await expect(page.getByTestId('result-count')).toContainText('8 screens')

  // Switch to list and select a screen → basket reflects it.
  await page.getByRole('button', { name: 'List' }).click()
  await expect(page.getByTestId('basket-count')).toHaveText('0')
  await page.getByRole('button', { name: 'Add', exact: true }).first().click()
  await expect(page.getByTestId('basket-count')).toHaveText('1')

  // CSV export of the filtered inventory downloads.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/mimu-screens-\d+\.csv/)
})
