# 2026-04-30 Local Development Handoff

## Purpose

This document brings the `standalone-app` branch up to date for local continuation. It is intended to replace the hidden context that previously lived in `/root/lologames/docs` so future work can continue from the GitHub repo alone.

## Repository

- Remote: `https://github.com/lolo-desu/standalone-app.git`
- Branch: `feature/mvp-bootstrap`
- Working directory during implementation: `/root/lologames/standalone-app`

## High-Level Goal

Build a standalone desktop MVP for `日记络络` without using SillyTavern's chat UI as the player-facing shell.

The target product is:

- a dedicated desktop app
- single-title first
- VN/galgame-style in-game shell
- real save/load/log flow
- model setup at new-game time
- support for story model plus optional logic model

## Locked Product Constraints

These decisions were already made and should be treated as baseline unless explicitly changed.

- Focus on one title first: `日记络络`
- Desktop host uses `Electrobun`
- Main menu must exist:
  - `继续`
  - `新游戏`
  - `加载存档`
  - `设置`
  - `退出`
- New game must collect model/provider information
- Save system is VN-style full-session snapshot save/load
- In-game bottom controls must include:
  - `Q.save`
  - `Q.load`
  - `save`
  - `load`
  - `log`
  - `setting`
  - `hide`
- Main gameplay actions are:
  - `互动`
  - `移动`
  - `调查`
- `调查` is temporary context only:
  - not a formal log entry
  - does not advance a formal turn
  - should expire after three subsequent dialogue turns

Not in scope for phase 1:

- multi-title platform productization
- chapter tree / branch tree replay
- arbitrary timeline jumping
- plaintext API keys inside save snapshots
- migrating the full SillyTavern backend to Bun

## Implemented Architecture

### Workspace

- `apps/desktop`
  - Electrobun app shell
  - path resolution
  - config persistence
  - main/renderer RPC bridge
  - renderer bootstrap and Vue shell
- `apps/engine`
  - Bun-served local HTTP API
  - session creation
  - action application
  - save/load endpoints
- `packages/shared`
  - typed session/runtime schemas
- `packages/content-riji`
  - initial content bootstrap for `日记络络`

### Runtime Flow

Current boot path:

1. Electrobun launches `apps/desktop/src/bun/index.ts`
2. `src/main.ts` calls `launchElectrobunApp(...)`
3. `src/bootstrap.ts` resolves local paths and starts the engine server
4. `src/electrobun-main.ts` creates the desktop window and exposes RPC
5. Window loads `views://renderer/index.html`
6. `src/renderer/index.ts` starts the renderer bootstrap and mounts Vue
7. `src/renderer/electrobun-entry.ts` loads runtime data from Electrobun RPC
8. `src/renderer/main.ts` combines runtime state with `App.vue`

### Engine/Data Flow

- `apps/engine/src/server.ts`
  - serves `/health`
  - serves `/session/new`
  - serves `/session/action`
  - serves `/session/save`
  - serves `/session/load`
- `apps/engine/src/routes/session.ts`
  - validates payloads with Zod
  - creates initial session snapshots
  - applies `interact / move / investigate`
  - auto-saves after formal actions
- `apps/desktop/src/renderer/api/client.ts`
  - talks to the local engine base URL injected at startup

## Implemented Functional Status

The following areas are in place:

- shared session/runtime contracts
- initial engine request handler and session routes
- disk-backed save snapshot repository
- local config store for:
  - credential profiles
  - app settings
- desktop bootstrap path and local data directory resolution
- Electrobun RPC bridge for config and renderer runtime injection
- renderer bootstrap wrappers
- game shell component files and basic menu/new-game skeletons
- `content-riji` fallback for the opening line when external source content is missing

## Important Historical Fixes Already Landed

### 1. Windows launcher no longer hangs on Bun entrypoint mismatch

Previous problem:

- Electrobun flat-files launcher expected `Resources/app/bun/index.js`
- build produced `main.js`

Fix already landed:

- `apps/desktop/electrobun.config.ts` now points Bun entry at `src/bun/index.ts`
- `src/bun/index.ts` imports `../main`

### 2. Renderer runtime is no longer passed via `views://...?...`

Previous problem:

- `views://renderer/index.html?engineBaseUrl=...` was treated like a flat-file path with query string included
- loader tried to open a non-existent file path ending in `index.html?engineBaseUrl=...`

Fix already landed:

- window URL is back to plain `views://renderer/index.html`
- engine base URL is now injected through Electrobun RPC `loadRendererRuntime()`

### 3. Renderer entrypoint now tries to mount the Vue app

Current related files:

- `apps/desktop/src/renderer/index.ts`
- `apps/desktop/src/renderer/electrobun-entry.ts`
- `apps/desktop/src/renderer/main.ts`

Latest code path:

- `index.ts` waits for `bootstrapElectrobunRenderer(...)`
- `electrobun-entry.ts` now defaults to `./main`, not raw `./bootstrap`
- `main.ts` returns `{ App, ...runtime }`
- `index.ts` mounts `createApp(App).mount('#app')`

This contract is covered by tests, but the real Windows runtime is still white.

## Verification Status

Last full verification run in this branch:

```bash
npm test
```

Verified result:

- `21` passing test files
- `85` passing tests
- `typecheck:test-contracts` passed

Focused renderer tests also passed before handoff:

```bash
npx vitest run apps/desktop/src/renderer/electrobun-entry.test.ts
npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/main-wrapper.test.ts
```

## Current Blocking Issue

### Symptom

On Windows, `npx electrobun dev` opens the app window, but the content area remains pure white.

### What Is Confirmed

The latest user-side runtime log confirms all of the following are happening:

- launcher loads successfully
- engine server starts
- app paths are resolved
- engine base URL is created and logged
- `views/renderer/index.html` is read
- `views/renderer/index.js` is read
- WebView navigation completes

Representative log sequence:

```text
[LAUNCHER] Loading app code from flat files
Server started at http://localhost:50000
App paths { ... }
Engine env { RIJI_LUOLUO_SAVES_DIR: "C:\\Users\\y1048\\riji-luoluo\\saves" }
Engine base URL http://127.0.0.1:62932
DEBUG loadViewsFile: Attempting flat file read: ...Resources\app\views\renderer/index.html
DEBUG loadViewsFile: Attempting flat file read: ...Resources\app\views\renderer/index.js
[WebView2] NavigationCompleted fired for webview 1
```

### What Is Not Yet Confirmed

We still do not have proof of any of these renderer-side milestones in the real Windows runtime:

- `src/renderer/index.ts` reaches the `then(...)` continuation after bootstrap
- `bootstrapElectrobunRenderer(...)` resolves successfully in the packaged runtime
- `createApp(App)` succeeds in the packaged runtime
- `mount('#app')` executes successfully
- `App.vue` and `GameView.vue` render without runtime exceptions

### Best Current Interpretation

This is not the old launcher bug and not the old `views://...?...` bug.

The failure point is later in the renderer lifecycle. The white screen is now most likely caused by one of:

- a renderer-side runtime exception before or during mount
- a packaged-runtime incompatibility between Electrobun/WebView2 and the current renderer bundle
- a component/runtime problem that tests do not currently exercise

## Recommended Next Debug Pass

Do this in order. Avoid speculative fixes before evidence.

1. Get renderer console output from the actual Windows runtime
2. Add temporary logging at each renderer boundary:
   - `renderer/index.ts`
   - `renderer/electrobun-entry.ts`
   - `renderer/main.ts`
3. Confirm whether `App` is defined in the packaged runtime just before `createApp(App)`
4. Confirm whether the failure happens:
   - before RPC runtime load
   - during runtime load
   - during Vue app creation
   - during first component render
5. Only after that, write the next regression test for the actual discovered root cause

## Key Files For Continuation

### Desktop shell and bootstrap

- `apps/desktop/electrobun.config.ts`
- `apps/desktop/src/bun/index.ts`
- `apps/desktop/src/main.ts`
- `apps/desktop/src/bootstrap.ts`
- `apps/desktop/src/runtime.ts`
- `apps/desktop/src/electrobun-main.ts`
- `apps/desktop/src/electrobun-rpc.ts`

### Renderer

- `apps/desktop/src/renderer/index.html`
- `apps/desktop/src/renderer/index.ts`
- `apps/desktop/src/renderer/electrobun-entry.ts`
- `apps/desktop/src/renderer/main.ts`
- `apps/desktop/src/renderer/bootstrap.ts`
- `apps/desktop/src/renderer/App.vue`
- `apps/desktop/src/renderer/views/GameView.vue`
- `apps/desktop/src/renderer/components/GameHud.vue`

### Engine and saves

- `apps/engine/src/server.ts`
- `apps/engine/src/routes/session.ts`
- `apps/engine/src/services/session-service.ts`

### Content bootstrap

- `packages/content-riji/src/first-message.ts`
- `packages/content-riji/src/default-scene.ts`

## Local Development Commands

Install dependencies:

```bash
npm install
```

Run all tests:

```bash
npm test
```

Run the desktop shell:

```bash
cd apps/desktop
npx electrobun dev
```

Run focused renderer tests:

```bash
npx vitest run apps/desktop/src/renderer/electrobun-entry.test.ts
npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/main-wrapper.test.ts
```

## Local Runtime Data

Current path behavior is implemented in `apps/desktop/src/paths.ts`.

On Windows the app uses:

- data dir: `%USERPROFILE%\\riji-luoluo`
- saves dir: `%USERPROFILE%\\riji-luoluo\\saves`
- credentials: `%USERPROFILE%\\riji-luoluo\\config\\credentials.json`
- settings: `%USERPROFILE%\\riji-luoluo\\config\\settings.json`

Save snapshot layout under `saves`:

- `index.json`
- `quick.json`
- `auto.json`
- `manual/<slotId>.json`

## Documentation Gap Closed By This Handoff

Before this document, the following critical context was not stored in the repo itself:

- product scope decisions
- architecture summary
- startup/runtime wiring summary
- known blocker state
- local continuation instructions

This file and the root `README.md` are intended to be the new repo-local source of truth.

## Suggested Immediate Next Step On Local Machine

Continue from the current branch and start with evidence gathering, not refactoring:

1. pull latest `feature/mvp-bootstrap`
2. run `npm test`
3. run `cd apps/desktop && npx electrobun dev`
4. instrument renderer startup to capture the first failing boundary in the real Windows runtime
