# Performance Notes (@auk/ui)

## Current state (implemented)

Performance-related build optimizations are already active.

- Terser minification enabled
- Manual vendor chunk splitting enabled
- Bundle visualizer output enabled (`dist/stats.html`)
- `size-limit` checks configured
- Font loading narrowed with latin subsets

References:

- `vite.config.ts`
- `.size-limit.json`

## Useful commands

```bash
# Build
pnpm run build

# Analyze bundle graph
open dist/stats.html

# Validate size limits
pnpm run size
pnpm run size:why
```

## What to monitor in PRs

- unexpected growth of `dist/index.js`
- CSS/theme bundle growth
- chunk boundary changes that hurt cacheability

## Next optimization candidates

- Track bundle-size deltas in CI comments
- Add performance smoke benchmarks for critical components
- Review optional dependencies for further tree-shaking opportunities
