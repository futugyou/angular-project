import { test, expect } from '@playwright/test'

test.describe('Switch Component E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/switch')
  })

  test('Two-way Binding Test: Clicking the Switch should update the external status text', async ({
    page,
  }) => {
    const switchBtn = page
      .locator('section')
      .filter({ hasText: 'Signal two-way binding' })
      .getByRole('switch')
    const statusText = page.locator('text=/Current status: .*/')

    await expect(statusText).toContainText('false')

    await switchBtn.click()
    await expect(statusText).toContainText('true')

    // Test external button control over internal state
    await page.getByRole('button', { name: 'external click toggle' }).click()
    await expect(switchBtn).toHaveAttribute('aria-checked', 'false')
  })

  test('Reactive Forms Test: Verify disabled state and Reset functionality', async ({ page }) => {
    const formSection = page.locator('section').filter({ hasText: '2. Reactive Forms' })
    const notifySwitch = formSection.getByRole('switch').first() // Enable notifications
    const privacySwitch = formSection.getByRole('switch').nth(1) // Privacy mode
    const formValue = formSection.locator('.bg-gray-100')

    // Initial State (notifications defaults to true)
    await expect(notifySwitch).toHaveAttribute('aria-checked', 'true')
    await expect(privacySwitch).toBeDisabled()

    // Interaction Test
    await notifySwitch.click()
    await expect(formValue).toContainText('"notifications": false')

    // Form Reset Test
    await page.getByRole('button', { name: 'Reset form' }).click()
    await expect(notifySwitch).toHaveAttribute('aria-checked', 'false')
    await expect(privacySwitch).toHaveAttribute('aria-checked', 'true')
  })

  test('Accessibility Test: The keyboard Enter key should be able to operate the switch', async ({
    page,
  }) => {
    const switchBtn = page.getByRole('switch').first()

    await switchBtn.focus()
    await page.keyboard.press('Enter')

    const state = await switchBtn.getAttribute('aria-checked')
    await page.keyboard.press('Enter')
    await expect(switchBtn).toHaveAttribute('aria-checked', state === 'true' ? 'false' : 'true')
  })
})
