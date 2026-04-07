import { test, expect } from '@playwright/test'

test.describe('Badge Component E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing')
  })

  test('It should display correctly on the page and have the correct CSS properties.', async ({
    page,
  }) => {
    const badge = page.locator('app-badge:has-text("destructive")').first()

    await expect(badge).toBeVisible()

    const backgroundColor = await badge.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    )

    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('Responsive Check: Whether the height on mobile devices meets expectations', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const badge = page.locator('app-badge').first()
    const box = await badge.boundingBox()

    expect(box?.height).toBeGreaterThan(15)
  })
})
