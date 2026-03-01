import { ref, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'auk-ui-theme'

/**
 * Composable for managing theme switching
 *
 * @example
 * ```ts
 * import { useTheme } from '@auk/ui'
 *
 * const { theme, setTheme, resolvedTheme } = useTheme()
 *
 * // Set theme
 * setTheme('light')
 * setTheme('dark')
 * setTheme('auto') // Follow system preference
 * ```
 */
export const useTheme = () => {
  // Local state for this instance
  const currentTheme = ref<Theme>('auto')
  const resolvedTheme = ref<'light' | 'dark'>('dark')

  /**
   * Get the system's preferred color scheme
   */
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark'

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  /**
   * Apply theme to document
   */
  const applyTheme = (theme: 'light' | 'dark') => {
    if (typeof document === 'undefined') return

    document.documentElement.setAttribute('data-theme', theme)
    resolvedTheme.value = theme
  }

  /**
   * Update theme based on current setting
   */
  const updateTheme = () => {
    if (currentTheme.value === 'auto') {
      const systemTheme = getSystemTheme()
      applyTheme(systemTheme)
    } else {
      applyTheme(currentTheme.value)
    }
  }

  /**
   * Set the theme
   */
  const setTheme = (newTheme: Theme) => {
    currentTheme.value = newTheme

    // Save to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme)
    }

    updateTheme()
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  const initTheme = () => {
    if (typeof localStorage === 'undefined') {
      updateTheme()
      return
    }

    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null

    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      currentTheme.value = savedTheme
    }

    updateTheme()
  }

  /**
   * Listen for system theme changes
   */
  const setupSystemThemeListener = () => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (currentTheme.value === 'auto') {
        updateTheme()
      }
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }

  // Initialize on mount
  onMounted(() => {
    initTheme()
    const cleanup = setupSystemThemeListener()

    // Cleanup on unmount
    return cleanup
  })

  return {
    /**
     * Current theme setting ('light', 'dark', or 'auto')
     */
    theme: currentTheme,

    /**
     * Resolved theme ('light' or 'dark')
     * This is the actual theme being displayed
     */
    resolvedTheme,

    /**
     * Set the theme
     */
    setTheme,

    /**
     * Get the current system theme preference
     */
    getSystemTheme,

    /**
     * Initialize theme manually (useful for testing)
     * @internal
     */
    initTheme,
  }
}
