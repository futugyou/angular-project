import { test, expect } from '@playwright/test'

test.describe('ScrollArea E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/scroll')
  })

  test('User should be able to reach the bottom of the list by dragging the scrollbar', async ({
    page,
  }) => {
    const scrollContainer = page.locator('#test-scroll-area')

    const viewport = scrollContainer.locator('.viewport-container')
    const thumb = scrollContainer.locator('.thumb-el')

    await scrollContainer.hover()
    await expect(thumb).toBeVisible()

    const thumbBounds = await thumb.boundingBox()
    const containerBounds = await scrollContainer.boundingBox()

    if (thumbBounds && containerBounds) {
      // 3. Perform the drag action
      await page.mouse.move(
        thumbBounds.x + thumbBounds.width / 2,
        thumbBounds.y + thumbBounds.height / 2,
      )
      await page.mouse.down()
      // Drag to just above the bottom of the container
      await page.mouse.move(
        thumbBounds.x + thumbBounds.width / 2,
        containerBounds.y + containerBounds.height - 5,
        { steps: 10 },
      )
      await page.mouse.up()
    }

    // 4. Assertions
    const lastItem = scrollContainer.getByText('100', { exact: true })
    await expect(lastItem).toBeInViewport()

    // Verify that scrollTop has indeed increased
    const scrollTop = await viewport.evaluate((el) => el.scrollTop)
    expect(scrollTop).toBeGreaterThan(500)
  })

  test('Thumb position should update synchronously when scrolling with the mouse wheel', async ({
    page,
  }) => {
    const scrollContainer = page.locator('#test-scroll-area')
    const viewport = scrollContainer.locator('.viewport-container')
    const thumb = scrollContainer.locator('.thumb-el')

    await viewport.hover()

    await page.mouse.wheel(0, 600)

    const transform = await thumb.evaluate((el) => window.getComputedStyle(el).transform)
    expect(transform).not.toBe('matrix(1, 0, 0, 1, 0, 0)')
  })
})
