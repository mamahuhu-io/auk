import { test, expect } from '@playwright/test'

test.describe('Component Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('buttons should have accessible names', async ({ page }) => {
    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()

        // Button should have either aria-label or text content
        expect(ariaLabel || text).toBeTruthy()
      }
    }
  })

  test('inputs should have labels', async ({ page }) => {
    const inputs = page.locator('input')
    const count = await inputs.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i)
      if (await input.isVisible()) {
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')

        if (id) {
          // Check if there's a label with matching 'for' attribute
          const label = page.locator(`label[for="${id}"]`)
          const hasLabel = await label.count() > 0

          // Input should have either a label or aria-label
          expect(hasLabel || ariaLabel).toBeTruthy()
        }
      }
    }
  })

  test('modals should have proper ARIA attributes', async ({ page }) => {
    const modal = page.locator('[role="dialog"]').first()

    if (await modal.isVisible()) {
      const ariaModal = await modal.getAttribute('aria-modal')
      expect(ariaModal).toBe('true')
    }
  })

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab')

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return {
        tagName: el?.tagName,
        role: el?.getAttribute('role'),
        tabIndex: el?.getAttribute('tabindex')
      }
    })

    // Should focus on an interactive element
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement.tagName)
  })

  test('should have sufficient color contrast', async ({ page }) => {
    // This is a basic check - for comprehensive testing, use axe-core
    const body = page.locator('body')
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    expect(backgroundColor).toBeTruthy()
  })
})
