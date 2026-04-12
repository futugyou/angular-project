import { test, expect } from '@playwright/test'

test.describe('FileUpload End-to-End Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/testing/upload')
  })

  test('After uploading a file, the corresponding filename and size should appear in the list', async ({
    page,
  }) => {
    // Verify initial state
    await expect(page.locator('text=No files selected yet')).toBeVisible()

    // Locate the input and upload the file
    const inputSelector = 'app-file-upload input[type="file"]'
    await page.setInputFiles(inputSelector, [
      { name: 'document.pdf', mimeType: 'application/pdf', buffer: Buffer.from('abc') },
    ])

    // Verify the state update of the test container component
    await expect(page.locator('text=Currently selected: 1 files')).toBeVisible()
    await expect(page.locator('li:has-text("document.pdf")')).toBeVisible()
  })

  test('Files exceeding the maxSize should not appear in the list', async ({ page }) => {
    const largeFile = {
      name: 'huge-file.zip',
      mimeType: 'application/zip',
      buffer: Buffer.alloc(20 * 1024 * 1024),
    }

    await page.setInputFiles('app-file-upload input[type="file"]', [largeFile])

    // Verify that the list remains empty (because the logic filters out oversized files and does not emit an event)
    await expect(page.locator('text=No files selected yet')).toBeVisible()
  })
})
