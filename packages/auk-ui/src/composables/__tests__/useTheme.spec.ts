import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useTheme } from '../useTheme'
import type { Theme } from '../useTheme'

// Helper component to test the composable
const TestComponent = defineComponent({
  setup() {
    const themeApi = useTheme()
    return { themeApi }
  },
  template: '<div></div>',
})

describe('useTheme', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    // Reset document theme attribute
    document.documentElement.removeAttribute('data-theme')

    // Clear all mocks
    vi.clearAllMocks()
  })

  it('initializes with auto theme by default', () => {
    const wrapper = mount(TestComponent)
    const { theme } = wrapper.vm.themeApi

    expect(theme.value).toBe('auto')
  })

  it('applies dark theme when system prefers dark', () => {
    // Mock matchMedia to return dark preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const wrapper = mount(TestComponent)
    const { getSystemTheme } = wrapper.vm.themeApi

    expect(getSystemTheme()).toBe('dark')
  })

  it('applies light theme when system prefers light', () => {
    // Mock matchMedia to return light preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const wrapper = mount(TestComponent)
    const { getSystemTheme } = wrapper.vm.themeApi

    expect(getSystemTheme()).toBe('light')
  })

  it('sets theme to light', () => {
    const wrapper = mount(TestComponent)
    const { setTheme, theme, resolvedTheme } = wrapper.vm.themeApi

    setTheme('light')

    expect(theme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(resolvedTheme.value).toBe('light')
  })

  it('sets theme to dark', () => {
    const wrapper = mount(TestComponent)
    const { setTheme, theme, resolvedTheme } = wrapper.vm.themeApi

    setTheme('dark')

    expect(theme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(resolvedTheme.value).toBe('dark')
  })

  it('persists theme to localStorage', () => {
    const wrapper = mount(TestComponent)
    const { setTheme } = wrapper.vm.themeApi

    setTheme('light')

    expect(localStorage.getItem('auk-ui-theme')).toBe('light')
  })

  it('loads theme from localStorage', () => {
    localStorage.setItem('auk-ui-theme', 'dark')

    const wrapper = mount(TestComponent)
    const { theme } = wrapper.vm.themeApi

    expect(theme.value).toBe('dark')
  })

  it('handles invalid localStorage value', () => {
    localStorage.setItem('auk-ui-theme', 'invalid' as Theme)

    const wrapper = mount(TestComponent)
    const { theme } = wrapper.vm.themeApi

    // Should fall back to auto
    expect(theme.value).toBe('auto')
  })

  it('updates theme when switching from auto to explicit', () => {
    const wrapper = mount(TestComponent)
    const { setTheme, theme, resolvedTheme } = wrapper.vm.themeApi

    // Start with auto
    expect(theme.value).toBe('auto')

    // Switch to light
    setTheme('light')

    expect(theme.value).toBe('light')
    expect(resolvedTheme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('exports Theme type', () => {
    // This test ensures the type is exported correctly
    const validThemes: Theme[] = ['light', 'dark', 'auto']
    expect(validThemes).toHaveLength(3)
  })
})
