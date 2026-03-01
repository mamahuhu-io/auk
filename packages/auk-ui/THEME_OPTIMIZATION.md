# Theme System Notes (@auk/ui)

## Current state (implemented)

The theme system is already in use, not just planned.

- `light` / `dark` / `auto` theme modes are supported
- Theme preference persists in `localStorage`
- `auto` follows OS color scheme (`prefers-color-scheme`)
- `data-theme` is applied on `document.documentElement`
- `useTheme()` is exported from `@auk/ui`

References:

- `src/composables/useTheme.ts`
- `src/assets/scss/themes.scss`

## API

```ts
import { useTheme } from "@auk/ui"

const { theme, resolvedTheme, setTheme, getSystemTheme } = useTheme()
```

## Implementation notes

- `theme` is the user-selected mode (`light` | `dark` | `auto`)
- `resolvedTheme` is the effective mode (`light` | `dark`)
- system theme changes are observed and applied when mode is `auto`

## Follow-up optimization candidates

- Reduce duplicated theme variable declarations
- Add visual regression checks for theme-specific components
- Add SSR-safe initialization helper for host apps if needed
