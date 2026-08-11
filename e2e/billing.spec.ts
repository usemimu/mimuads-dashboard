import { test, expect, type Page } from '@playwright/test'

/**
 * Slice-5 e2e: wallet balance renders, and an advertiser can request a
 * bank-transfer invoice which appears in the list. Top-up (Paystack) + transfers
 * (needs list-workspaces) aren't driven here. Requires the seeded backend.
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Phone or email').fill('agency@demo.usemimu.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('billing: wallet balance + request an invoice', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Billing' }).click()
  await expect(page).toHaveURL(/\/billing/)

  // Wallet balance card shows a naira amount.
  await expect(page.getByTestId('wallet-balance')).toContainText('₦')

  // Request a bank-transfer invoice.
  await page.getByRole('button', { name: 'Invoices' }).click()
  await page.getByLabel('Amount (₦)').fill('150000')
  await page.getByLabel('Purpose (optional)').fill('Q3 media buy')
  await page.getByRole('button', { name: 'Request invoice' }).click()

  // It appears in the invoices table.
  await expect(page.getByTestId('invoice-row').first()).toBeVisible()
})
