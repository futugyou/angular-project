import { test, expect } from '@playwright/test'

test.describe('Card Component E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/card', { waitUntil: 'domcontentloaded' })
  })

  test('The page should display the card content and title correctly', async ({ page }) => {
    const pageHeading = page.locator('h1')
    await expect(pageHeading).toHaveText('Card Component Test')
    const cardTitle = page.locator('[data-slot="card-title"]')
    await expect(cardTitle).toContainText('Card Title')
    const actionBtn = page.locator('[data-slot="card-action"] button')
    await expect(actionBtn).toBeVisible()
    await expect(actionBtn).toHaveText('Edit')
  })

  test('Cards should conform to responsive layout structure', async ({ page }) => {
    const cardHeader = page.locator('[data-slot="card-header"]')
    await expect(cardHeader).toHaveCSS('display', 'grid')

    const content = page.locator('[data-slot="card-content"]')
    await expect(content).toContainText('content area of ​​the card')

    const footer = page.locator('[data-slot="card-footer"]')
    await expect(footer).toHaveCSS('padding-left', '24px') // px-6 = 1.5rem = 24px
  })
})
