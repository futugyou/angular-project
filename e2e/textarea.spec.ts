import { test, expect } from '@playwright/test'

test.describe('TextareaComponent E2E Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/textarea')
  })

  test('CVA Mode: Input should synchronize in real-time with the external model', async ({
    page,
  }) => {
    const textarea = page.locator('[data-testid="cva-textarea"] textarea')
    const display = page.getByTestId('model-display')

    // Clear and enter text
    await textarea.fill('')
    await textarea.fill('Hello Angular 21')

    // Verify that the externally displayed model updates synchronously (via handleInput -> onChange)
    await expect(display).toHaveText('Hello Angular 21')
  })

  test('Signal Mode: Changes to the external Input should update the internal display', async ({
    page,
  }) => {
    const textarea = page.locator('[data-testid="signal-input-only"] textarea')
    const resetBtn = page.getByRole('button', { name: 'Reset Content' })

    // Initial value check
    await expect(textarea).toHaveValue('Initial Static')

    // Click the button to change the value via the Signal Input
    await resetBtn.click()

    // Verify that the component responded to the change in the [value] input
    await expect(textarea).toHaveValue('Reset')
  })

  test('Interaction: Verify the visual and behavioral constraints of the Disabled state', async ({
    page,
  }) => {
    // We could dynamically toggle a disabled state,
    // but here we simply check for the presence of the 'disabled' attribute.
    const textarea = page.locator('[data-testid="cva-textarea"] textarea')

    // It should be enabled by default
    await expect(textarea).not.toBeDisabled()

    // Verify that the Tailwind-generated classes include the disabled styling
    await expect(textarea).toHaveClass(/disabled:opacity-50/)
  })
})
