# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repository root unless noted otherwise.

```bash
npm install
npm test
npm run typecheck:test-contracts
npm run test:shared
npx vitest run packages/shared/src/session.test.ts
npx vitest run packages/shared/src/runtime.test.ts
npx vitest run apps/engine/src/server.test.ts
```

Run the desktop app locally:

```bash
cd apps/desktop
npx electrobun dev
```

## Architecture

This repository is a Bun workspace for a standalone desktop MVP of `日记络络`. The app is a dedicated single-title VN shell, not a multi-title launcher.

### Workspace roles

- `apps/desktop`: Electrobun host app. It resolves runtime paths, starts the local engine, persists local config, creates the desktop window, and exposes RPC used by the renderer.
- `apps/engine`: local Bun HTTP engine. It owns the `/health`, `/session/new`, `/session/action`, `/session/save`, and `/session/load` endpoints.
- `packages/shared`: Zod-based runtime, save, and session schemas shared across desktop and engine. Treat this package as the contract source of truth before changing API payloads or persisted state shape.
- `packages/content-riji`: title bootstrap data for `日记络络`, including first-message fallback content.

### Desktop startup flow

The desktop app starts in `apps/desktop/src/main.ts`, which calls `launchElectrobunApp(...)` in `apps/desktop/src/electrobun-main.ts`. That path runs `bootstrap()` from `apps/desktop/src/bootstrap.ts`, which:

1. resolves user-scoped data paths with `getAppPaths()`
2. creates the config store and RPC handlers
3. launches the local Bun engine server
4. returns the engine base URL so the renderer can talk to the engine

`launchElectrobunApp()` then creates the Electrobun window and injects `engineBaseUrl` through the Electrobun RPC layer instead of encoding it in the `views://` URL.

Electrobun build entrypoints are defined in `apps/desktop/electrobun.config.ts`:

- Bun main entry: `src/bun/index.ts`
- Renderer entry: `src/renderer/index.ts`
- Copied HTML shell: `src/renderer/index.html -> views/renderer/index.html`

### Main-process and renderer boundary

The desktop shell keeps configuration and renderer runtime bootstrapping on the RPC boundary:

- `apps/desktop/src/config-store.ts` reads and writes `credentials.json` and `settings.json` under the user data directory.
- `apps/desktop/src/config-rpc.ts` defines the config RPC surface shared between main and renderer.
- `apps/desktop/src/electrobun-rpc.ts` adapts those handlers to Electrobun's `defineRPC(...)` API and adds `loadRendererRuntime()`.

Renderer code should get engine connection details from RPC, not from hardcoded paths or query parameters.

### Engine and state model

The engine is intentionally thin HTTP glue around typed session state:

- `apps/engine/src/server.ts` dispatches incoming requests to health and session route handlers.
- Session state and action payload shapes live in `packages/shared/src/session.ts` and `packages/shared/src/runtime.ts`.
- The session model includes model configuration, gameplay state, timeline state, log state, scene state, investigation state, and save metadata.

The design docs under `docs/superpowers/specs/2026-04-28-riji-luoluo-standalone-design.md` define the intended separation between:

- `timeline`: internal runtime truth and state transitions
- `log`: VN-style player-readable history
- `scene`: current frame shown in the galgame shell
- `investigation_state`: short-lived context that should not be treated like a normal log or save-triggering action

Keep those boundaries intact when changing session flow or persistence.

### Persistence model

Runtime data is stored outside the repo under a user-scoped `riji-luoluo` directory. `apps/desktop/src/paths.ts` defines the layout:

- `saves/` for save snapshots
- `config/credentials.json` for credential profiles
- `config/settings.json` for app settings

The desktop side persists config directly to disk; the engine uses the saves directory for session snapshot save/load behavior.

The product design requires that API keys stay in app-level config and not inside save files. Session and save data should store profile references and model snapshots, not raw secrets.

### Product scope that affects code decisions

This repo is for a single-title MVP focused on `日记络络`. The intended UX is a dedicated VN/galgame-style desktop app with:

- main menu entries `继续 / 新游戏 / 加载存档 / 设置 / 退出`
- in-game controls `Q.save / Q.load / save / load / log / setting / hide`
- main gameplay actions `互动 / 移动 / 调查`
- support for story model plus optional logic model in the session schema/runtime shape

Avoid generalizing architecture toward multi-title platform concerns unless the requirements change.

### Upstream integration boundaries

The imported research docs in `docs/research/` are the main reference for upstream migration boundaries:

- `2026-04-28-sillytavern-standalone-survey.md`
- `2026-04-28-standalone-host-adapter-map.md`
- `2026-04-28-lolocard-riji-luoluo-reference-map.md`

Use them when working on upstream compatibility. The intended direction is:

- reuse SillyTavern as a capability/backend layer, not as the final frontend shell
- reuse JS-Slash-Runner runtime and tools selectively, behind a new host adapter
- treat `lolocard` `日记络络` as a content package plus gameplay runtime, not as the desktop host itself

If a change starts pulling this repo back toward a chat-floor SillyTavern host model, it is probably going in the wrong direction.

### Frontend status

The UI handoff in `docs/research/2026-04-29-frontend-ui-handoff.md` is the source of truth for the current renderer visual state:

- the in-game galgame scene shell is the accepted visual baseline
- main menu, save/load, log, and action modal styling still exist as functional skeletons and need a separate design pass

When editing renderer UI, preserve the accepted in-game scene direction unless the task explicitly reopens that design.

### Current repo context

The README and `docs/2026-04-30-local-dev-handoff.md` describe the current branch as already having the desktop shell, engine runtime, config persistence, save/load plumbing, and shared contracts implemented.

They also note an unresolved Windows white-screen issue after the renderer assets load. Be careful with renderer startup, asset loading, and main/renderer boot changes, and verify those paths when touching them.
