<div align="center">

# @auk/ui

Vue 3 component library used by Auk.

</div>

## Installation

```bash
pnpm add @auk/ui
# or npm install @auk/ui
```

## Setup

```ts
import { createApp } from "vue"
import App from "./App.vue"
import AukUIPlugin from "@auk/ui"

import "@auk/ui/style.css"
import "@auk/ui/themes.css"

createApp(App).use(AukUIPlugin).mount("#app")
```

Tailwind preset:

```ts
import aukUIPreset from "@auk/ui/ui-preset"

export default {
  content: ["src/**/*.{vue,html}", "./node_modules/@auk/ui/dist/**/*.js"],
  presets: [aukUIPreset],
}
```

## Usage example

```vue
<template>
  <AukButtonPrimary label="Save" @click="onSave" />
</template>

<script setup lang="ts">
import { AukButtonPrimary } from "@auk/ui"

const onSave = () => {
  console.log("saved")
}
</script>
```

## Theme API

```ts
import { useTheme } from "@auk/ui"

const { theme, resolvedTheme, setTheme } = useTheme()
setTheme("auto")
```

Supported modes:

- `light`
- `dark`
- `auto`

## Toast API

```ts
import { toast } from "@auk/ui"

toast.success("Done")
toast.error("Failed")
toast.warning("Warning")
```

## Development

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm run do-typecheck
pnpm run test
pnpm run test:e2e
pnpm run size
```

Bundle analysis report:

```bash
open dist/stats.html
```

## Docs in this package

- [Theme Optimization](./THEME_OPTIMIZATION.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [E2E Testing Guide](./e2e/README.md)

## License

MIT
