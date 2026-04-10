import { test, expect } from '@playwright/test'

test.describe('Alert E2E', () => {
  test('The accessibility role should be displayed correctly on the page.', async ({ page }) => {
    await page.goto('/testing/alert', { waitUntil: 'domcontentloaded' })

    const alert = page.locator('app-alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveAttribute('role', 'alert')

    const title = alert.locator('app-alert-title')
    await expect(title).toContainText('Update Available')
  })
})
