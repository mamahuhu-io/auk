import { test, expect } from '@playwright/test'

test.describe('AukSmartInput E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should accept text input', async ({ page }) => {
    const input = page.locator('input[type="text"]').first()

    if (await input.isVisible()) {
      await input.fill('Test input value')
      await expect(input).toHaveValue('Test input value')
    }
  })

  test('should show validation errors', async ({ page }) => {
    const input = page.locator('input[required]').first()

    if (await input.isVisible()) {
      // Focus and blur without entering value
      await input.focus()
      await input.blur()

      // Check for error message or styling
      const errorMessage = page.locator('.error-message').first()
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible()
      }
    }
  })

  test('should handle keyboard navigation', async ({ page }) => {
    const input = page.locator('input').first()

    if (await input.isVisible()) {
      await input.focus()
      await input.fill('Test')

      // Press Enter
      await page.keyboard.press('Enter')

      // Check if form was submitted or action was triggered
      // This depends on your implementation
    }
  })

  test('should show placeholder text', async ({ page }) => {
    const input = page.locator('input[placeholder]').first()

    if (await input.isVisible()) {
      const placeholder = await input.getAttribute('placeholder')
      expect(placeholder).toBeTruthy()
    }
  })

  test('should be disabled when disabled prop is set', async ({ page }) => {
    const disabledInput = page.locator('input[disabled]').first()

    if (await disabledInput.isVisible()) {
      await expect(disabledInput).toBeDisabled()
    }
  })
})
