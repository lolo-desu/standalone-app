# standalone-app

Standalone desktop MVP workspace for `日记络络`.

This repository is the self-contained handoff target for local development. Earlier design and planning context originally lived outside the repo; the current status and continuation notes are now documented here.

## Repo Status

- Remote: `https://github.com/lolo-desu/standalone-app.git`
- Active branch: `feature/mvp-bootstrap`
- Current state: desktop shell, engine runtime, config persistence, session runtime, and save/load plumbing are implemented
- Current blocker: Windows app window opens, but renderer is still white after `index.html` and `index.js` load

See `docs/2026-04-30-local-dev-handoff.md` for the full continuation document.

## Product Scope

This MVP is intentionally focused on a single work: `日记络络`.

- Desktop app, not SillyTavern chat UI
- Main menu: `继续 / 新游戏 / 加载存档 / 设置 / 退出`
- In-game shell stays in galgame presentation
- Bottom actions: `Q.save / Q.load / save / load / log / setting / hide`
- Runtime actions: `互动 / 移动 / 调查`
- Save model: quick save, manual slots, single auto-save slot
- Dual-model routing supported in schema/runtime shape

Explicitly not in scope for phase 1:

- Multi-title platformization
- Timeline tree browsing / branch rewind
- Arbitrary timeline jumping
- Saving plaintext API keys inside save snapshots

## Workspace Layout

- `apps/desktop`
  - Electrobun desktop shell
  - renderer entrypoint and Vue app shell
  - local config persistence and RPC bridge
- `apps/engine`
  - Bun HTTP runtime for session creation, actions, and save/load
- `packages/shared`
  - shared session/runtime contracts
- `packages/content-riji`
  - normalized `日记络络` content bootstrap and first-message fallback
- `docs`
  - repo-local handoff and continuation docs

## Common Commands

From repo root:

```bash
npm install
npm test
```

Run the desktop app locally:

```bash
cd apps/desktop
npx electrobun dev
```

## Current Verification Snapshot

Latest verified in this branch before handoff:

- `npm test`
- Result: `21` test files passed, `85` tests passed
- `typecheck:test-contracts` passed

## Key Files For The Current Blocker

- `apps/desktop/src/main.ts`
- `apps/desktop/src/electrobun-main.ts`
- `apps/desktop/src/electrobun-rpc.ts`
- `apps/desktop/src/renderer/index.ts`
- `apps/desktop/src/renderer/electrobun-entry.ts`
- `apps/desktop/src/renderer/main.ts`
- `apps/desktop/src/renderer/App.vue`
- `apps/desktop/src/renderer/views/GameView.vue`

## Local Data Paths

At runtime, the app writes outside the repo:

- Windows data dir: `%USERPROFILE%\\riji-luoluo`
- Saves: `%USERPROFILE%\\riji-luoluo\\saves`
- Credentials: `%USERPROFILE%\\riji-luoluo\\config\\credentials.json`
- Settings: `%USERPROFILE%\\riji-luoluo\\config\\settings.json`

## Notes

- The renderer white-screen issue is not considered resolved yet.
- The latest docs in this repo are intended to be the source of truth for continuing development locally.
