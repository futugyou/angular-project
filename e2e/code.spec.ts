import { test, expect } from '@playwright/test'

test.describe('CodeBlock E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test route
    await page.goto('/testing/code')
  })

  test('Verify CodeBlock hover display logic and line-wrapping styles', async ({ page }) => {
    // Locate the second example (HTML line-wrapping test)
    const htmlSection = page.locator('section').filter({ hasText: '2. Multiline HTML' })
    const codeBlock = htmlSection.locator('app-code-block')
    const copyBtn = codeBlock.getByRole('button')

    // 1. Verify CSS line-wrapping property
    const codeElement = codeBlock.locator('code')
    await expect(codeElement).toHaveCSS('white-space', 'pre-wrap')

    // 2. Verify Hover interaction: Initially invisible (opacity-0), becomes visible on hover
    await expect(copyBtn).toHaveClass(/opacity-0/)
    await codeBlock.hover()
    await expect(copyBtn).toBeVisible()
    await expect(copyBtn).toHaveCSS('opacity', '1')
  })

  test('Verify feedback state after clicking "Copy"', async ({ page }) => {
    const firstBlock = page.locator('app-code-block').first()
    const btn = firstBlock.getByRole('button')

    await firstBlock.hover()
    await btn.click()

    // Verify the Title tooltip
    await expect(btn).toHaveAttribute('title', 'Copied!')

    // Verify restoration after 2 seconds (Playwright will wait automatically, or you can wait manually)
    await expect(btn).toHaveAttribute('title', 'Copy code', { timeout: 3000 })
  })
})
