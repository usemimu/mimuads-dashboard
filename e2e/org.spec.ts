import { test, expect, type Page } from '@playwright/test'

/**
 * Slice-6 e2e: Org admin (members list + create a workspace) and the org/
 * workspace switcher enumeration + switch (the fast-follow endpoints are live).
 * Requires the seeded backend (agency org + GTBank/Indomie workspaces).
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Phone or email').fill('agency@demo.usemimu.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('org admin: members + create a client workspace', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Organization' }).click()
  await expect(page).toHaveURL(/\/organization/)

  // Members tab shows the owner.
  await expect(page.getByTestId('member-row').first()).toBeVisible()

  // Workspaces tab — seeded workspaces present; create a new one.
  await page.getByRole('button', { name: 'Workspaces' }).click()
  await expect(page.getByTestId('workspace-row').first()).toBeVisible()
  const name = `E2E Client ${Date.now()}`
  await page.getByLabel('Workspace name').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText(name)).toBeVisible()
})

test('switcher: enumerate + switch to a workspace context', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Switch organization' }).click()
  // The dropdown lists the org's workspaces; pick GTBank.
  await page.getByRole('button', { name: /GTBank/ }).click()
  // Header now reflects the workspace context.
  await expect(page.getByText(/GTBank/).first()).toBeVisible()
})
