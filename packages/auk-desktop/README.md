# Auk Desktop App <sup>ALPHA</sup>

Auk Desktop is the local-first desktop client for Auk, built with Tauri v2.

## What it includes

- Local workspace management (file-system based)
- Workspace Git sync workflow (setup, sync, history, conflict handling)
- HTTP / GraphQL / realtime API tools
- Native relay integration for advanced network scenarios
- Built-in app update workflow

## Development

From repository root:

```bash
pnpm install
pnpm --filter auk-desktop run tauri dev
```

Build desktop app:

```bash
pnpm --filter auk-desktop run tauri build
```

Or inside `packages/auk-desktop`:

```bash
pnpm install
pnpm run tauri dev
pnpm run tauri build
```

## Minimum requirements

### Windows

- Windows 10 (1803+) or Windows 11
- x64

### macOS

- macOS 10.15+ (Catalina or later)
- Intel x64 or Apple Silicon

### Linux

- x64
- Recommended: Ubuntu 24.04+ (or equivalent)
- Minimum runtime compatibility: GLIBC 2.38+

## Notes for Linux graphics stack

Some Wayland + WebKit combinations may show rendering issues in specific environments.
If needed, try:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 auk
# or
WEBKIT_DISABLE_DMABUF_RENDERER=1 auk
```
