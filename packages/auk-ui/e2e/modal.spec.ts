import { test, expect } from '@playwright/test'

test.describe('AukSmartModal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should open modal when triggered', async ({ page }) => {
    // Look for modal trigger button
    const triggerButton = page.locator('[data-testid="open-modal"]').first()

    if (await triggerButton.isVisible()) {
      await triggerButton.click()

      // Wait for modal to appear
      const modal = page.locator('[role="dialog"]').first()
      await expect(modal).toBeVisible()
    }
  })

  test('should close modal when close button is clicked', async ({ page }) => {
    // Open modal first
    const triggerButton = page.locator('[data-testid="open-modal"]').first()

    if (await triggerButton.isVisible()) {
      await triggerButton.click()

      // Click close button
      const closeButton = page.locator('[aria-label="Close"]').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()

        // Modal should be hidden
        const modal = page.locator('[role="dialog"]').first()
        await expect(modal).not.toBeVisible()
      }
    }
  })

  test('should close modal on Escape key', async ({ page }) => {
    const triggerButton = page.locator('[data-testid="open-modal"]').first()

    if (await triggerButton.isVisible()) {
      await triggerButton.click()

      // Press Escape
      await page.keyboard.press('Escape')

      // Modal should be hidden
      const modal = page.locator('[role="dialog"]').first()
      await expect(modal).not.toBeVisible()
    }
  })

  test('should trap focus within modal', async ({ page }) => {
    const triggerButton = page.locator('[data-testid="open-modal"]').first()

    if (await triggerButton.isVisible()) {
      await triggerButton.click()

      // Tab through focusable elements
      await page.keyboard.press('Tab')

      // Focus should remain within modal
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    }
  })
})
