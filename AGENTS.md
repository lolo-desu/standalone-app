# AGENTS.md

## Commands
- Run repo commands from the workspace root unless noted otherwise.
- Install dependencies with `npm install`.
- Full verification is `npm test`. This runs `vitest run` and then `npm run typecheck:test-contracts`.
- The only root-level focused scripts are `npm run typecheck:test-contracts` and `npm run test:shared`.
- Useful single-file checks:
  - `npx vitest run apps/engine/src/server.test.ts`
  - `npx vitest run packages/shared/src/session.test.ts`
  - `npx vitest run packages/shared/src/runtime.test.ts`
  - `npx vitest run apps/desktop/src/renderer/electrobun-entry.test.ts`
  - `npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/main-wrapper.test.ts`
- Run the desktop app from `apps/desktop` with `npx electrobun dev`.

## Repo Shape
- This is a Bun workspace (`packageManager: bun@1.1.38`), but the checked-in developer commands use `npm`, not `bun run`.
- `apps/desktop` is the live desktop host. Do not confuse it with `docs/research/ui-prototype`, which is a separate Vite prototype with its own `package.json`.
- `apps/engine` is the local HTTP engine.
- `packages/shared` is the contract source of truth for session/runtime payloads and persisted snapshot shape.
- `packages/content-riji` is title bootstrap content for `日记络络`.

## Boot Flow
- Electrobun build entrypoints are fixed in `apps/desktop/electrobun.config.ts`:
  - Bun main: `src/bun/index.ts`
  - Renderer: `src/renderer/index.ts`
  - Copied HTML shell: `src/renderer/index.html -> views/renderer/index.html`
- Desktop startup path is `apps/desktop/src/bun/index.ts` -> `apps/desktop/src/main.ts` -> `apps/desktop/src/electrobun-main.ts` -> `apps/desktop/src/bootstrap.ts`.
- Keep the renderer URL as plain `views://renderer/index.html`. `engineBaseUrl` is injected through Electrobun RPC via `loadRendererRuntime()`, not through query params or hardcoded renderer config.
- Renderer boot currently goes through `apps/desktop/src/renderer/index.ts` -> `electrobun-entry.ts` -> `main.ts`.

## Contracts And Persistence
- Change `packages/shared/src/session.ts` and `packages/shared/src/runtime.ts` before changing engine or renderer payload handling.
- Session slices are intentionally separated: `timelineState`, `logState`, `sceneState`, and `investigationState` are distinct schema fields. Do not collapse them into one history blob.
- In `apps/engine/src/routes/session.ts`, `/session/action` auto-saves only formal actions. `investigate` returns the updated session without saving an auto snapshot.
- Runtime data is written outside the repo under the user home directory via `apps/desktop/src/paths.ts`:
  - `riji-luoluo/saves`
  - `riji-luoluo/config/credentials.json`
  - `riji-luoluo/config/settings.json`
- Config persistence is owned by the desktop app (`apps/desktop/src/config-store.ts`). Save snapshots are owned by the engine. Do not move API keys into save files.

## Current Caution
- README and handoff docs still describe an unresolved Windows white-screen issue after renderer assets load. Be careful when touching renderer startup, asset loading, or main/renderer boot wiring.

## Missing Tooling
- There is no verified root lint, format, build, CI workflow, or pre-commit config in this repo today. Do not invent those steps in repo instructions.
