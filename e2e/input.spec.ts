import { test, expect } from '@playwright/test'

test.describe('Input Component Comprehensive E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/input')
  })

  test('standalone mode: should respond correctly to [value] bindings and inputs', async ({
    page,
  }) => {
    const input = page.getByTestId('standalone-input').locator('input')
    const display = page.getByTestId('standalone-display')

    await expect(input).toHaveValue('Initial Static')

    await input.fill('Changed via E2E')
    await expect(display).toHaveText('Changed via E2E')
  })

  test('Two-way binding: [(ngModel)] should achieve synchronization', async ({ page }) => {
    const input = page.getByTestId('model-input').locator('input')
    const display = page.getByTestId('model-display')

    await input.fill('Two-way sync')
    await expect(display).toHaveText('Two-way sync')
  })

  test('Responsive form: should support Form control and disabled state', async ({ page }) => {
    const inputContainer = page.getByTestId('reactive-input')
    const input = inputContainer.locator('input')
    const display = page.getByTestId('reactive-display')
    const toggleBtn = page.getByRole('button', { name: 'Toggle disabled state' })

    await expect(input).toHaveValue('Reactive Value')

    await toggleBtn.click()
    await expect(input).toBeDisabled()

    await toggleBtn.click()
    await expect(input).toBeEnabled()

    await input.fill('FormControl Update')
    await expect(display).toHaveText('FormControl Update')
  })
})
