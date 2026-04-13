import { test, expect } from '@playwright/test'

test.describe('ScrollArea E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/scroll')
  })

  test('User should be able to reach the bottom of the list by dragging the scrollbar', async ({
    page,
  }) => {
    const scrollArea = page.locator('app-scroll-area')
    const viewport = page.locator('.viewport-container')

    // 1. Trigger the scrollbar to appear
    await scrollArea.hover()
    const thumb = page.locator('.thumb-el')
    await expect(thumb).toBeVisible()

    // 2. Get track information
    const thumbBounds = await thumb.boundingBox()
    const areaBounds = await scrollArea.boundingBox()

    if (thumbBounds && areaBounds) {
      // 3. Perform the drag action
      await page.mouse.move(
        thumbBounds.x + thumbBounds.width / 2,
        thumbBounds.y + thumbBounds.height / 2,
      )
      await page.mouse.down()
      // Drag to just above the bottom of the container
      await page.mouse.move(
        thumbBounds.x + thumbBounds.width / 2,
        areaBounds.y + areaBounds.height - 5,
        { steps: 10 },
      )
      await page.mouse.up()
    }

    // 4. Assertions
    const lastItem = page.getByText('100', { exact: true })
    await expect(lastItem).toBeInViewport()

    // Verify that scrollTop has indeed increased
    const scrollTop = await viewport.evaluate((el) => el.scrollTop)
    expect(scrollTop).toBeGreaterThan(500)
  })

  test('Thumb position should update synchronously when scrolling with the mouse wheel', async ({
    page,
  }) => {
    const viewport = page.locator('.viewport-container')
    const thumb = page.locator('.thumb-el')

    await viewport.hover()

    // Simulate mouse wheel scroll
    await page.mouse.wheel(0, 500)

    // Verify that the thumb has moved away from the top (transform: translateY is not 0)
    const transform = await thumb.evaluate((el) => window.getComputedStyle(el).transform)
    expect(transform).not.toBe('matrix(1, 0, 0, 1, 0, 0)')
  })
})
