import { test, expect } from '@playwright/test'

test.describe('Dialog E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test route
    await page.goto('/testing/dialog')
  })

  test('should successfully open and close the Dialog', async ({ page }) => {
    const openBtn = page.getByRole('button', { name: 'open' })

    // 1. Click to open
    await openBtn.click()

    // 2. Verify dialog content is visible
    const dialogTitle = page.locator('app-dialog-title')
    await expect(dialogTitle).toBeVisible()
    await expect(dialogTitle).toHaveText('title')

    // 3. Verify description and content
    await expect(page.locator('app-dialog-description')).toContainText('description')
    await expect(page.locator('app-dialog-content')).toContainText('automatic line wrapping')

    // 4. Click the close button (DialogCloseComponent)
    await page.locator('app-dialog-close button').click()

    // 5. Verify the dialog has been dismissed
    await expect(dialogTitle).toBeHidden()
  })

  test('clicking the Cancel button in the Footer should also close the Dialog', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'open' }).click()

    const cancelBtn = page.getByRole('button', { name: 'cancel' })
    await cancelBtn.click()

    // Verify the dialog is no longer present
    await expect(page.locator('app-dialog-title')).toBeHidden()
  })

  test('pressing the ESC key should close the dialog (CDK default behavior)', async ({ page }) => {
    await page.getByRole('button', { name: 'open' }).click()
    await expect(page.locator('app-dialog-title')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.locator('app-dialog-title')).not.toBeVisible()
  })
})
