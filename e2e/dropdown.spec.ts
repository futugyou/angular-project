import { test, expect } from '@playwright/test'

test.describe('Dropdown E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/dropdown')
  })

  test('should open the menu and toggle the status bar selection state', async ({ page }) => {
    // 1. Click the trigger button
    await page.getByRole('button', { name: 'Open settings' }).click()

    // 2. Check the initial state of the checkbox
    const checkbox = page.getByRole('menuitemcheckbox', { name: 'Show status bar' })
    await expect(checkbox).toBeVisible()

    // Check for the presence of the lucideCheck icon (assuming it is rendered as an SVG)
    const checkIcon = checkbox.locator('ng-icon[name="lucideCheck"]')
    await expect(checkIcon).toBeVisible()

    // 3. Click to toggle the state
    await checkbox.click()

    // 4. Re-open the menu and verify that the icon has disappeared
    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(checkIcon).not.toBeVisible()
  })
})
