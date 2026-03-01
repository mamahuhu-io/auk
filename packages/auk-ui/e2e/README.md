# E2E Testing Guide for @auk/ui

This directory contains end-to-end tests for the @auk/ui component library using Playwright.

## Setup

E2E tests are already configured. To run them:

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests in UI mode (interactive)
pnpm test:e2e:ui

# Run E2E tests in debug mode
pnpm test:e2e:debug
```

## Test Structure

### Test Files

- `button.spec.ts` - Tests for button components
- `modal.spec.ts` - Tests for modal components
- `input.spec.ts` - Tests for input components
- `accessibility.spec.ts` - Accessibility tests for all components

### Configuration

The Playwright configuration is in `playwright.config.ts` and includes:

- **Test Directory**: `./e2e`
- **Base URL**: `http://localhost:5173`
- **Browsers**: Chromium, Firefox, WebKit
- **Dev Server**: Automatically starts before tests
- **Reporters**: HTML report (see `playwright-report/`)

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Component Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should do something', async ({ page }) => {
    const element = page.locator('selector')
    await expect(element).toBeVisible()
  })
})
```

### Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Test user interactions** not implementation details
3. **Test accessibility** - keyboard navigation, ARIA attributes
4. **Use page object pattern** for complex pages
5. **Keep tests independent** - each test should work in isolation

### Example: Testing a Button

```typescript
test('should handle click events', async ({ page }) => {
  const button = page.locator('[data-testid="submit-button"]')
  await button.click()

  // Assert expected behavior
  const successMessage = page.locator('.success-message')
  await expect(successMessage).toBeVisible()
})
```

### Example: Testing a Modal

```typescript
test('should open and close modal', async ({ page }) => {
  // Open modal
  await page.click('[data-testid="open-modal"]')
  const modal = page.locator('[role="dialog"]')
  await expect(modal).toBeVisible()

  // Close modal
  await page.keyboard.press('Escape')
  await expect(modal).not.toBeVisible()
})
```

## Running Tests

### All Tests

```bash
pnpm test:e2e
```

### Specific Test File

```bash
pnpm test:e2e button.spec.ts
```

### Specific Browser

```bash
pnpm test:e2e --project=chromium
```

### Headed Mode (see browser)

```bash
pnpm test:e2e --headed
```

### Debug Mode

```bash
pnpm test:e2e:debug
```

## CI/CD Integration

The tests are configured to run in CI with:
- Retries on failure (2 retries)
- Single worker (no parallel execution)
- HTML reporter for results

## Troubleshooting

### Dev Server Not Starting

If the dev server doesn't start automatically:

```bash
# Start dev server manually in another terminal
pnpm dev

# Run tests with existing server
pnpm test:e2e
```

### Timeout Issues

Increase timeout in `playwright.config.ts`:

```typescript
use: {
  timeout: 30000, // 30 seconds
}
```

### Debugging Failed Tests

1. Run in debug mode: `pnpm test:e2e:debug`
2. Check screenshots in `test-results/`
3. View HTML report: `npx playwright show-report`

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)
