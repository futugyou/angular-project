import { test, expect } from '@playwright/test'

test.describe('Tooltip E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/tooltip')
  })

  test('should correctly open and display Tooltips at different positions', async ({ page }) => {
    const topButton = page.getByRole('button', { name: 'top' })

    await topButton.hover()

    const tooltip = page.locator('.tooltip-content')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('Tooltip')

    await expect(tooltip.locator('ng-icon')).toBeVisible()
  })

  test('switching between multiple Tooltips should not leave behind stacking remnants', async ({
    page,
  }) => {
    const buttons = ['top', 'bottom', 'left', 'right']

    for (const pos of buttons) {
      const btn = page.getByRole('button', { name: pos })
      await btn.hover()

      await expect(page.locator('.tooltip-content')).toBeVisible()

      await page.mouse.move(0, 0)
      await expect(page.locator('.tooltip-content')).toHaveCount(0)
    }
  })
})
