# @auk/plugin-relay

Tauri plugin bridge for `auk-relay`.

It exposes two commands to the frontend:

- `execute(request)`
- `cancel(requestId)`

## Features

- Desktop HTTP relay bridge based on `auk-relay`
- Advanced request/auth/security/proxy options passthrough
- Typed request/response payloads for Tauri frontend code

## Requirements

- Tauri 2.x
- Rust 1.77.2+
- Node.js 22+ for JS package workflows

## Installation

### Rust (Tauri app)

```toml
# Cargo.toml
[dependencies]
tauri-plugin-relay = { path = "../auk-plugin-relay" }
```

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_relay::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### JavaScript / TypeScript

```json
{
  "dependencies": {
    "@auk/plugin-relay": "workspace:^"
  }
}
```

## Quick usage

```ts
import { execute, cancel } from "@auk/plugin-relay"

const result = await execute({
  id: 1,
  url: "https://api.example.com/data",
  method: "POST",
  version: "HTTP/1.1",
  headers: {
    "content-type": "application/json",
  },
  content: {
    kind: "json",
    content: { hello: "world" },
    mediaType: "application/json",
  },
})

if (result.kind === "success") {
  console.log(result.response.status, result.response.statusText)
} else {
  console.error(result.error)
}

await cancel(1)
```

## Supported request capabilities

- Methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `CONNECT`, `TRACE`
- Content kinds: `text`, `json`, `xml`, `form`, `binary`, `multipart`, `urlencoded`
- Auth kinds: `none`, `basic`, `bearer`, `digest`, `oauth2`, `apikey`, `aws`
- Security: custom CA/client certs, host/peer verification flags
- Proxy: URL + optional auth

## Development

```bash
pnpm --filter @auk/plugin-relay run build
```

## License

MIT
