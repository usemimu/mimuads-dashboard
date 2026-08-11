import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'

/**
 * Slice-2 e2e (requires the seeded backend on :8000 + the local redis the API
 * uses on 127.0.0.1:6379). Covers the SMB onboarding path (§7.1 minus KYB/topup/
 * campaign) and proves password-login sessions now persist (the login-password
 * cookie-transport fix).
 */

function readOtp(phoneE164: string): string {
  const raw = execSync(`redis-cli GET "otp:advertiser:${phoneE164}"`, { encoding: 'utf8' }).trim()
  const code = JSON.parse(raw).code as string
  if (!/^\d{6}$/.test(code)) throw new Error(`bad OTP for ${phoneE164}: ${raw}`)
  return code
}

test('SMB onboarding: signup → OTP → create advertiser org → dashboard', async ({ page }) => {
  const local = '81' + String(Math.floor(1e7 + Math.random() * 8.9e7)) // 10 digits
  const phone = '+234' + local
  const email = `web.smb.${Date.now()}@demo.usemimu.com`

  // Page 1 — create account
  await page.goto('/signup')
  await page.getByLabel('First name').fill('Web')
  await page.getByLabel('Last name').fill('Tester')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Phone number').fill(local)
  await page.getByLabel('Password', { exact: true }).fill('Kp7#vRq2Lm9t')
  await page.getByLabel('Confirm password').fill('Kp7#vRq2Lm9t')
  await page.getByRole('button', { name: 'Next' }).click()

  // Page 2 — OTP (read the code the backend stored in redis)
  await expect(page).toHaveURL(/\/signup\/verify/)
  const code = readOtp(phone)
  await page.getByLabel('Verification code').fill(code)
  await page.getByRole('button', { name: 'Verify' }).click()

  // Page 3 — org fork (advertiser)
  await expect(page).toHaveURL(/\/signup\/organization/)
  await page.getByText("I'm advertising my own business").click()
  await page.getByLabel('Business / legal name').fill('Web Tester Foods')
  await page.getByLabel('Business category').selectOption('restaurant')
  await page.getByLabel('Business type').selectOption('sme')
  await page.getByLabel('State').selectOption('Lagos')
  await page.getByLabel('LGA').selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Create organization' }).click()

  // Lands in the shell
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('password login session persists across reload (cookie transport)', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Phone or email').fill('agency@demo.usemimu.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.reload()
  // Still authenticated after reload — silent refresh from the httpOnly cookie.
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
