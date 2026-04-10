import { test, expect } from '@playwright/test'

test.describe('Checkbox Component E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Visit the test page route
    await page.goto('/testing/checkbox', { waitUntil: 'domcontentloaded' })
  })

  test('Reactive Forms Section: Clicking should update the form JSON value and support toggling disabled state', async ({
    page,
  }) => {
    const checkbox = page
      .locator('section')
      .filter({ hasText: 'Reactive Forms' })
      .getByRole('checkbox')
    const jsonOutput = page.locator('code')

    // Initial state
    await expect(jsonOutput).toContainText('"acceptTerms": false')

    // Click action
    await checkbox.click()
    await expect(jsonOutput).toContainText('"acceptTerms": true')

    // Test disabled logic
    const toggleDisableBtn = page.getByRole('button', { name: 'Toggle Disable State' })
    await toggleDisableBtn.click()
    await expect(checkbox).toHaveAttribute('aria-disabled', 'true')

    // Clicking while disabled should not change the value
    await checkbox.click({ force: true }) // Force click to test behavior
    await expect(jsonOutput).toContainText('"acceptTerms": true')
  })

  test('Indeterminate State Section: Clicking should toggle to checked state and change the icon', async ({
    page,
  }) => {
    const section = page.locator('section').filter({ hasText: 'Indeterminate State' })
    const checkbox = section.locator('[role="checkbox"][data-state]')

    // 1. Check the initial state
    await expect(checkbox).toHaveAttribute('aria-checked', 'mixed')

    // Check if the ng-icon exists and is visible
    const icon = checkbox.locator('ng-icon')
    await expect(icon).toBeVisible()

    // Tip: Since ng-icon places the icon name either within its internal content or in its class attributes,
    // if your ng-icon changes its internal content based on the 'name' prop, you could check the innerHTML or a specific class.
    // Alternatively—and most simply—you can validate the checkbox's 'data-state' attribute; this alone is sufficient to prove the logic is correct.
    await expect(checkbox).toHaveAttribute('data-state', 'indeterminate')

    // 2. Click
    await checkbox.click()

    // 3. Check the checked state
    await expect(checkbox).toHaveAttribute('aria-checked', 'true')
    await expect(checkbox).toHaveAttribute('data-state', 'checked')

    await expect(checkbox.locator('ng-icon svg')).toBeVisible()
  })

  test('Two-way Binding Section: External button should be able to control the Checkbox state', async ({
    page,
  }) => {
    const section = page.locator('section').filter({ hasText: 'Standard Model Binding' })
    const checkbox = section.getByRole('checkbox')
    const statusText = section.locator('strong')
    const externalBtn = section.getByRole('button', { name: 'Toggle Externally' })

    await expect(statusText).toHaveText('false')

    // Click external button
    await externalBtn.click()

    await expect(statusText).toHaveText('true')
    await expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })
})
