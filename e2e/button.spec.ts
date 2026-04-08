import { test, expect } from '@playwright/test'

test.describe('Button Component E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing')
    await page.waitForLoadState('networkidle')
  })

  test('A button acting as a link should navigate correctly', async ({ page }) => {
    const linkButton = page.getByRole('link', { name: 'Link' })

    await expect(linkButton).toBeVisible()
    await expect(linkButton).toHaveClass(/inline-flex/)

    await linkButton.click()
    await expect(page).toHaveURL(/\/orders/)
  })

  test('A disabled button should not respond to interactions', async ({ page }) => {
    const disabledBtn = page.getByRole('button', { name: 'disabled' })

    await expect(disabledBtn).toBeDisabled()

    const pointerEvents = await disabledBtn.evaluate((el) => getComputedStyle(el).pointerEvents)
    const opacity = await disabledBtn.evaluate((el) => getComputedStyle(el).opacity)

    expect(pointerEvents).toBe('none')
    expect(parseFloat(opacity)).toBeLessThan(1)
  })

  test('Style validation for different Variants', async ({ page }) => {
    const destructiveBtn = page.getByRole('button', { name: 'destructive', exact: true })
    await expect(destructiveBtn).toHaveClass(/bg-destructive/)

    const outlineBtn = page.getByRole('button', { name: 'outline' })
    await expect(outlineBtn).toHaveClass(/border/)
    await expect(outlineBtn).toHaveClass(/bg-background/)
  })

  test('Visual consistency check for Size', async ({ page }) => {
    const smallBtn = page.getByRole('button', { name: 'destructive', exact: true }) // size="sm" -> h-8 (32px)
    const largeBtn = page.getByRole('button', { name: 'outline' }) // size="lg" -> h-10 (40px)

    const smBox = await smallBtn.boundingBox()
    const lgBox = await largeBtn.boundingBox()

    if (smBox && lgBox) {
      expect(lgBox.height).toBeGreaterThan(smBox.height)
      expect(smBox.height).toBeCloseTo(32, 0)
      expect(lgBox.height).toBeCloseTo(40, 0)
    }
  })

  test('Icon button (Icon Size) verification', async ({ page }) => {
    const iconBtn = page.locator('button[title="default"]')
    const box = await iconBtn.boundingBox()

    expect(box?.width).toBeCloseTo(36, 0)
    expect(box?.height).toBeCloseTo(36, 0)

    const svg = iconBtn.locator('svg')
    await expect(svg).toBeVisible()
  })
})
