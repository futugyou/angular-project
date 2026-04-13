import { test, expect } from '@playwright/test'

test.describe('Select Component E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/select')
  })

  test('Interaction Flow: Open, Select, and State Synchronization', async ({ page }) => {
    const trigger = page.locator('app-select-trigger')
    const statusText = page.locator('span.font-bold.text-blue-600')

    // 1. Verify initial value (Angular: derived from the initial Signal value)
    await expect(statusText).toHaveText('Angular')

    // 2. Open the dropdown
    await trigger.click()
    const popover = page.locator('.select-content-portal')
    await expect(popover).toBeVisible()

    // 3. Select a new value
    await page.getByText('Vite').click()

    // 4. Verify that the dropdown closes and the status updates
    await expect(popover).not.toBeVisible()
    await expect(statusText).toHaveText('Vite')
  })

  test('External Reset Button Should Control Internal Component State', async ({ page }) => {
    // 1. First, select a value
    await page.locator('app-select-trigger').click()
    await page.getByText('React').click()
    await expect(page.locator('app-select-value')).toContainText('React')

    // 2. Click the 'Reset' button on the page
    await page.getByRole('button', { name: 'Reset to Angular' }).click()

    // 3. Verify that the internal value of the Select component has reverted
    await expect(page.locator('app-select-value')).toContainText('Angular')

    // 4. Verify that the Check icon is in the correct position (a form of visual regression testing)
    await page.locator('app-select-trigger').click()
    const angularItem = page.locator('app-select-item', { hasText: 'Angular' })
    await expect(angularItem.locator('ng-icon[name="lucideCheck"]')).toBeVisible()
  })

  test('Disabled State Test', async ({ page }) => {
    await page.goto('/testing/select')
    await page.locator('[data-slot="select-trigger"]').click()

    const disabledItem = page.locator('[data-slot="select-item"]:has-text("Webpack")')

    // Check... The logic in `itemClass()` is: `this.disabled() ? 'opacity-50 pointer-events-none' : ''`
    await expect(disabledItem).toHaveClass(/pointer-events-none/)

    // Try clicking; the overlay should not be closed
    await disabledItem.click({ force: true })
    await expect(page.locator('[data-slot="select-content"]')).toBeAttached()
  })
})
