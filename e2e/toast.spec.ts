import { test, expect } from '@playwright/test'

test.describe('Toast System E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/toast')
  })

  test('should show and auto-hide a success toast', async ({ page }) => {
    const successBtn = page.getByRole('button', { name: /success notification/i })
    // 1. Click the button to trigger the Toast
    await successBtn.click()
    const toast = page.locator('app-toast')
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Operation successful!')

    // 2. Verify background color (Tailwind class check)
    await expect(toast.locator('div').first()).toHaveClass(/bg-green-50/)

    // 3. Verify automatic dismissal (defaults to 4s; waiting a little longer here)
    await expect(toast).toBeHidden({ timeout: 6000 })
  })

  test('should close toast manually when clicking X button', async ({ page }) => {
    await page.getByRole('button', { name: /error notification/i }).click()

    const toast = page.locator('app-toast')
    await expect(toast).toBeVisible()

    // Click the close button
    await toast.getByRole('button').click()

    // Verify immediate dismissal logic
    await expect(toast).toBeHidden()
  })

  test('should stack multiple toasts', async ({ page }) => {
    await page.getByRole('button', { name: /info notification/i }).click()
    await page.getByRole('button', { name: /warning notification/i }).click()

    const toasts = page.locator('app-toast')
    await expect(toasts).toHaveCount(2)
  })
})
