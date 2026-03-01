# @auk/kernel

Cross-platform runtime abstraction for Auk.

## Modules

- `io`: file save dialogs, external links, event bridge
- `relay`: request execution abstraction (web relay / desktop relay)
- `store`: namespaced persistence abstraction

## Initialize

```ts
import { initKernel } from "@auk/kernel"

const kernel = initKernel("web")
// or
const kernel = initKernel("desktop")
```

## Relay usage

```ts
import * as E from "fp-ts/Either"

const exec = kernel.relay.execute({
  id: 1,
  url: "https://httpbin.org/get",
  method: "GET",
  version: "HTTP/1.1",
})

const result = await exec.response
if (E.isRight(result)) {
  console.log(result.right.status)
} else {
  console.error(result.left)
}
```

## Store usage

`store` APIs require `storePath` as first argument.

```ts
const storePath = "workspace-main"

await kernel.store.init(storePath)
await kernel.store.set(storePath, "settings", "theme", "dark")
const theme = await kernel.store.get<string>(storePath, "settings", "theme")
```

## IO usage

```ts
await kernel.io.saveFileWithDialog({
  data: JSON.stringify({ ok: true }),
  suggestedFilename: "result.json",
  contentType: "application/json",
})
```
