<div align="center">
  <a href="https://auk.mamahuhu.io">
    <img
      src="https://github.com/user-attachments/assets/40117561-a072-452b-bf05-b1be7586bfce"
      alt="Auk"
      height="64"
    />
  </a>
  <h3><b>Auk</b></h3>
  <b>Open Source API Development Ecosystem - Local First Edition</b>

[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen?logo=github)](CODE_OF_CONDUCT.md)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fauk.mamahuhu.io&logo=auk)](https://auk.mamahuhu.io)
[![Tests](https://github.com/mamahuhu-io/auk/actions/workflows/tests.yml/badge.svg)](https://github.com/mamahuhu-io/auk/actions)
</div>

Auk is a local-first API development toolkit. This repository contains the web app, desktop app, CLI, runtime kernel, relay stack, and shared packages.

## Features

- Local workspace model with file-based storage
- Workspace-level Git sync flow (setup, sync, history, conflict handling)
- API request tooling for HTTP, GraphQL, and realtime protocols:
  - WebSocket
  - Server-Sent Events (SSE)
  - Socket.IO
  - MQTT
- Pre-request and post-request test scripts (modern sandbox by default)
- Environments, collections, import/export, and response tools
- Cross-platform desktop app (Tauri v2) with built-in update workflow
- CLI for running collection test scripts in CI

## Monorepo packages

- `packages/auk-common`: shared app UI/logic modules
- `packages/auk-desktop`: desktop app shell and platform integrations
- `packages/auk-cli`: CI-oriented collection test runner
- `packages/auk-kernel`: cross-platform runtime abstraction (io/relay/store)
- `packages/auk-relay`: Rust HTTP relay crate (desktop network engine)
- `packages/auk-plugin-relay`: Tauri plugin bridge for relay
- `packages/auk-js-sandbox`: script execution sandbox (web/node)
- `packages/auk-ui`: shared Vue UI component library

## Quick start

Requirements:

- Node.js 22+
- pnpm 10+

Install and run web development:

```bash
pnpm install
pnpm dev
```

Run desktop development:

```bash
pnpm dev:desktop
```

Run workspace checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## CLI

The CLI package lives at `packages/auk-cli` and is published as `@auk/cli`.

```bash
npm i -g @auk/cli
auk --help
```

## Documentation

- Product site: https://auk.mamahuhu.io
- Docs site: https://auk.mamahuhu.dev
- Repository docs: `docs/`

## Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) before submitting pull requests.

## Security

Please report security issues via [`SECURITY.md`](SECURITY.md).

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) and GitHub Releases.

## License

MIT. See [`LICENSE`](LICENSE).
