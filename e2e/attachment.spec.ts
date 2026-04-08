import { test, expect } from '@playwright/test'

test.describe('Attachment Gallery E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/attachment')
  })

  test('should show filename and delete button on hover', async ({ page }) => {
    const attachment = page.locator('app-attachment-preview').first()
    const fileName = attachment.locator('text=beach-vacation.jpg')

    await expect(fileName).toHaveCSS('opacity', '0')

    await attachment.hover()
    await expect(fileName).toHaveCSS('opacity', '1')
  })

  test('should emit event when delete is clicked', async ({ page }) => {
    const attachment = page
      .locator('app-attachment-preview')
      .filter({ hasText: 'podcast-episode-01.mp3' })

    await attachment.hover()

    await attachment.locator('div.relative.group').click({ force: true })
    await page.pause()

    await expect(attachment).toBeHidden()
  })
})
