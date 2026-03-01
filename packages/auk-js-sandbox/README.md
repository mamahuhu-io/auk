# @auk/js-sandbox

JavaScript sandbox package used by Auk to execute pre-request and post-request test scripts.

## Runtime model

- Modern sandbox: `faraday-cage` (default)
- Legacy fallback (Node only): `isolated-vm` (enabled via option)
- Targets:
  - `@auk/js-sandbox/web`
  - `@auk/js-sandbox/node`

## Exports

```ts
import { runPreRequestScript, runTestScript } from "@auk/js-sandbox/node"
// or
import { runPreRequestScript, runTestScript } from "@auk/js-sandbox/web"
```

## Behavior

- Pre-request scripts can mutate request/env/cookies context
- Post-request scripts produce test results and updated environments
- Experimental sandbox is enabled by default (`experimentalScriptingSandbox: true`)
- Node can opt out to legacy mode with `experimentalScriptingSandbox: false`

## Development

```bash
pnpm install
pnpm --filter @auk/js-sandbox run build
pnpm --filter @auk/js-sandbox run test
```

## Versioning

Pre-1.0/alpha behavior may change between minor releases.

## License

MIT
