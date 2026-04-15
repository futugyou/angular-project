import { test, expect } from '@playwright/test'

test.describe('Tabs E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/tab')
  })
  test('Should be able to switch tabs by clicking and update the page state', async ({ page }) => {
    // Check initial state
    const statusText = page.locator('p.text-gray-400')
    await expect(statusText).toContainText('Currently selected tab: account')

    // Switch to the Password tab
    const passwordTab = page.getByRole('tab', { name: 'Security Password' })
    await passwordTab.click()

    // Verify UI feedback
    await expect(passwordTab).toHaveAttribute('data-state', 'active')
    await expect(page.getByText('Change Password')).toBeVisible()
    await expect(statusText).toContainText('Currently selected tab: password')
  })

  test('Keyboard Navigation Test (Accessibility)', async ({ page }) => {
    const accountTab = page.getByRole('tab', { name: 'Account Settings' })

    // Focus the first tab
    await accountTab.focus()
    await expect(accountTab).toBeFocused()

    await page.keyboard.press('Tab')
    const passwordTab = page.getByRole('tab', { name: 'Security Password' })
    await expect(passwordTab).toBeFocused()
  })

  test('Fully ARIA-compliant tab switching flow', async ({ page }) => {
    const tabs = page.getByRole('tab')
    const panels = page.getByRole('tabpanel')

    // Default state: Only one panel is visible
    await expect(panels).toHaveCount(1)
    await expect(panels).toContainText('Account Details')

    // Click the second tab
    await tabs.nth(1).click()

    // Verify:
    // 1. Button state updates
    await expect(tabs.nth(0)).toHaveAttribute('data-state', 'inactive')
    await expect(tabs.nth(1)).toHaveAttribute('data-state', 'active')

    // 2. Content updates (Playwright's toBeVisible accounts for CSS hidden and DOM removal)
    await expect(page.getByText('Account Details')).not.toBeVisible()
    await expect(page.getByText('Change Password')).toBeVisible()
  })

  test('Verify the physical and stylistic state of inactive tabs', async ({ page }) => {
    await page.goto('/testing/tab')

    const inactiveContent = page.locator('app-tabs-content[value="password"]')

    // 1. The host element is indeed in the DOM (verified using state: 'attached')
    await expect(inactiveContent).toBeAttached()

    // 2. However, it is not visible to the user
    await expect(inactiveContent).toBeHidden()

    // 3. It contains no internal text content
    const contentText = await inactiveContent.innerText()
    expect(contentText.trim()).toBe('')
  })

  test('Verify button positioning with default left alignment', async ({ page }) => {
    const list = page.locator('app-tabs-list')
    const firstTrigger = page.getByRole('tab').first()

    const listBox = await list.boundingBox()
    const triggerBox = await firstTrigger.boundingBox()

    if (listBox && triggerBox) {
      // 1. Verify that the starting X-coordinate of the first button is very close to the starting X-coordinate of the List container (accounting for padding)
      const padding = 8 // p-1 is approximately 4px, depending on the Tailwind configuration
      expect(triggerBox.x - listBox.x).toBeLessThanOrEqual(padding)
    }
  })

  test('Verify how the `align` parameter modifies DOM classes', async ({ page }) => {
    const list = page.locator('app-tabs-list')

    // Initially, it should contain 'start'
    await expect(list).toHaveClass(/justify-start/)
  })
})
