# relay

Rust HTTP request relay used by Auk Desktop.

## Features

- libcurl-based execution engine
- HTTP version selection (`HTTP/1.0`, `HTTP/1.1`, `HTTP/2.0`, `HTTP/3.0`)
- Auth support: Basic, Bearer, Digest, OAuth2, API key, AWS SigV4
- Content handling: text/json/xml/form/binary/multipart/urlencoded
- TLS/certificate controls (client cert, custom CA, verify flags)
- Proxy support
- Request cancellation by request id
- Bundled CA fallback for minimal runtime environments

## Installation

```toml
[dependencies]
relay = { path = "../auk-relay" }
```

## Usage

```rust
use relay::{execute, Request};
use http::{Method, Version};

#[tokio::main]
async fn main() {
    let request = Request {
        id: 1,
        url: "https://httpbin.org/get".to_string(),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    match execute(request).await {
        Ok(response) => println!("{} {}", response.status, response.status_text),
        Err(err) => eprintln!("{err:?}"),
    }
}
```

## CA fallback

When system CA certificates are unavailable, relay can fall back to a bundled CA bundle.

Priority:

1. System CA certificates
2. Bundled CA certificates

Environment variable:

- `AUK_FORCE_SYSTEM_CA=1` -> force system CA only (disable bundled fallback)

## Testing

```bash
cd packages/auk-relay
cargo test --all-features
```

More docs:

- `TESTING.md`
- `VERIFICATION_REPORT.md`
- `BENCHMARKS.md`

## License

MIT
