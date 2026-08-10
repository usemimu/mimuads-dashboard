import { test, expect } from '@playwright/test'

/**
 * Slice-1 smoke. Verifies the router guard (shell gated behind auth), the login
 * page renders with brand + i18n, and a real cookie-transport password login
 * lands in the shell with the seeded agency owner's context (from the access
 * token). Requires the seeded backend on :8000 with a password set for
 * agency@demo.usemimu.com.
 */

test('unauthenticated visit is gated and redirected to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mimuads' })).toBeVisible()
})

test('password login lands in the shell with the seeded agency context', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Phone or email').fill('agency@demo.usemimu.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  // Identity from the login response + context from the decoded access token.
  await expect(page.getByText('Amaka (Agency)')).toBeVisible()
  await expect(page.getByText('agency').first()).toBeVisible()
})
