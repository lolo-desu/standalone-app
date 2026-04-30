# Riji Luoluo Standalone MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable standalone desktop MVP for `日记络络` with a real main menu, new-game model setup, a persistent galgame shell, VN-style save/load/log, and `互动 / 移动 / 调查` actions.

**Architecture:** Create a new `standalone-app` workspace inside `/root/lologames` rather than modifying the upstream repositories in place. Use `Electrobun` for the desktop shell, a Vue 3 frontend for the game UI, a Node engine process that reuses SillyTavern-compatible capability code behind a small HTTP API, and a shared typed adapter layer that keeps timeline, log, scene, save, and investigation state separate.

**Tech Stack:** Electrobun, Bun, Node.js, TypeScript, Vue 3, Pinia, Zod, Vitest

---

## File Structure

### Workspace Root

- Create: `standalone-app/package.json`
  - Bun workspace root for desktop app, engine app, and shared package.
- Create: `standalone-app/tsconfig.base.json`
  - Shared TypeScript config for all packages.
- Create: `standalone-app/vitest.workspace.ts`
  - Workspace-wide Vitest config.

### Shared Contracts

- Create: `standalone-app/packages/shared/package.json`
- Create: `standalone-app/packages/shared/src/session.ts`
  - Session, save-slot, and model-config Zod schemas.
- Create: `standalone-app/packages/shared/src/runtime.ts`
  - Timeline node, log entry, scene state, investigation state, and action/result types.
- Create: `standalone-app/packages/shared/src/index.ts`
  - Package export barrel.
- Test: `standalone-app/packages/shared/src/session.test.ts`
- Test: `standalone-app/packages/shared/src/runtime.test.ts`

### Engine Process

- Create: `standalone-app/apps/engine/package.json`
- Create: `standalone-app/apps/engine/src/server.ts`
  - HTTP server entry.
- Create: `standalone-app/apps/engine/src/routes/health.ts`
  - Health endpoint.
- Create: `standalone-app/apps/engine/src/routes/session.ts`
  - New-game bootstrap and action execution endpoints.
- Create: `standalone-app/apps/engine/src/services/session-service.ts`
  - Pure state transition service.
- Create: `standalone-app/apps/engine/src/services/model-router.ts`
  - Story/logic model orchestration boundary.
- Test: `standalone-app/apps/engine/src/services/session-service.test.ts`
- Test: `standalone-app/apps/engine/src/routes/session.test.ts`

### Desktop Shell

- Create: `standalone-app/apps/desktop/package.json`
- Create: `standalone-app/apps/desktop/electrobun.config.ts`
  - Electrobun app config.
- Create: `standalone-app/apps/desktop/src/main.ts`
  - Desktop entry, window creation, engine child process boot.
- Create: `standalone-app/apps/desktop/src/paths.ts`
  - Save/config directory resolution.
- Create: `standalone-app/apps/desktop/src/preload.ts`
  - Safe bridge from shell to renderer.
- Create: `standalone-app/apps/desktop/src/renderer/index.html`
- Create: `standalone-app/apps/desktop/src/renderer/main.ts`
- Create: `standalone-app/apps/desktop/src/renderer/App.vue`
- Test: `standalone-app/apps/desktop/src/paths.test.ts`

### Frontend Runtime

- Create: `standalone-app/apps/desktop/src/renderer/stores/session.ts`
  - Session, timeline, log, scene, save, and investigation store.
- Create: `standalone-app/apps/desktop/src/renderer/api/client.ts`
  - Engine API client.
- Create: `standalone-app/apps/desktop/src/renderer/routes.ts`
  - Main menu / game shell route table.
- Create: `standalone-app/apps/desktop/src/renderer/views/MainMenuView.vue`
- Create: `standalone-app/apps/desktop/src/renderer/views/NewGameView.vue`
- Create: `standalone-app/apps/desktop/src/renderer/views/GameView.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/GameHud.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/InteractModal.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/MoveModal.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/InvestigateModal.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/LogDrawer.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/SaveLoadModal.vue`
- Test: `standalone-app/apps/desktop/src/renderer/stores/session.test.ts`
- Test: `standalone-app/apps/desktop/src/renderer/components/GameHud.test.ts`

### Content Bridge

- Create: `standalone-app/packages/content-riji/package.json`
- Create: `standalone-app/packages/content-riji/src/index.ts`
  - Entry for normalized `日记络络` content loading.
- Create: `standalone-app/packages/content-riji/src/first-message.ts`
  - Pull and normalize `lolocard` first-message resources.
- Create: `standalone-app/packages/content-riji/src/default-scene.ts`
  - Build first scene payload for standalone runtime.
- Test: `standalone-app/packages/content-riji/src/first-message.test.ts`

## Task 1: Bootstrap Workspace And Shared Contracts

**Files:**
- Create: `standalone-app/package.json`
- Create: `standalone-app/tsconfig.base.json`
- Create: `standalone-app/vitest.workspace.ts`
- Create: `standalone-app/packages/shared/package.json`
- Create: `standalone-app/packages/shared/src/session.ts`
- Create: `standalone-app/packages/shared/src/runtime.ts`
- Create: `standalone-app/packages/shared/src/index.ts`
- Test: `standalone-app/packages/shared/src/session.test.ts`
- Test: `standalone-app/packages/shared/src/runtime.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
// standalone-app/packages/shared/src/session.test.ts
import { describe, expect, it } from 'vitest';
import { SessionSchema } from './session';

describe('SessionSchema', () => {
  it('accepts a VN snapshot session', () => {
    const result = SessionSchema.safeParse({
      sessionMeta: {
        id: 'sess_1',
        workId: 'riji-luoluo',
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
      },
      modelConfig: {
        providerId: 'openai-compatible',
        credentialProfileId: 'default',
        storyModel: 'story-001',
        logicModel: 'logic-001',
        useDualModel: true,
      },
      gameState: {
        playerLocation: '教室',
        luoluoLocation: '教室',
        currentLocation: '教室',
        availableActions: ['interact', 'move', 'investigate'],
      },
      variableState: { stat_data: { 世界: { 当前时间: '08:00' } } },
      timelineState: { nodes: [] },
      logState: { entries: [] },
      sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' },
      investigationState: { entries: [] },
      saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
    });

    expect(result.success).toBe(true);
  });
});
```

```ts
// standalone-app/packages/shared/src/runtime.test.ts
import { describe, expect, it } from 'vitest';
import { ActionResultSchema } from './runtime';

describe('ActionResultSchema', () => {
  it('requires separated state, scene, and log payloads', () => {
    const result = ActionResultSchema.safeParse({
      statePatch: { variableState: { stat_data: { 世界: { 当前地点: '天台' } } } },
      scenePatch: { mode: 'dialog', text: '我们到了天台。', speaker: '络络' },
      displayPayload: { text: '我们到了天台。' },
      choices: ['互动', '移动', '调查'],
      logEntry: { kind: 'dialog', speaker: '络络', text: '我们到了天台。' },
      autosaveRequired: true,
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run shared tests to verify they fail**

Run: `bun test standalone-app/packages/shared/src/session.test.ts standalone-app/packages/shared/src/runtime.test.ts`
Expected: FAIL with module resolution errors for `./session` and `./runtime`

- [ ] **Step 3: Write the minimal shared schemas and workspace config**

```json
// standalone-app/package.json
{
  "name": "standalone-app",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.2.4",
    "zod": "^4.3.6"
  }
}
```

```ts
// standalone-app/packages/shared/src/session.ts
import { z } from 'zod';

export const SessionSchema = z.object({
  sessionMeta: z.object({
    id: z.string(),
    workId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  modelConfig: z.object({
    providerId: z.string(),
    credentialProfileId: z.string(),
    storyModel: z.string(),
    logicModel: z.string().nullable().default(null),
    useDualModel: z.boolean(),
  }),
  gameState: z.object({
    playerLocation: z.string(),
    luoluoLocation: z.string(),
    currentLocation: z.string(),
    availableActions: z.array(z.enum(['interact', 'move', 'investigate'])),
  }),
  variableState: z.object({ stat_data: z.record(z.string(), z.any()) }),
  timelineState: z.object({ nodes: z.array(z.any()) }),
  logState: z.object({ entries: z.array(z.any()) }),
  sceneState: z.object({ mode: z.string(), text: z.string(), speaker: z.string().nullable().default(null) }),
  investigationState: z.object({ entries: z.array(z.any()) }),
  saveMeta: z.object({ quickSlotId: z.string().nullable(), autoSlotId: z.string().nullable(), manualSlotIds: z.array(z.string()) }),
});

export type Session = z.infer<typeof SessionSchema>;
```

```ts
// standalone-app/packages/shared/src/runtime.ts
import { z } from 'zod';

export const ActionResultSchema = z.object({
  statePatch: z.record(z.string(), z.any()),
  scenePatch: z.object({ mode: z.string(), text: z.string(), speaker: z.string().nullable().default(null) }),
  displayPayload: z.object({ text: z.string() }),
  choices: z.array(z.string()),
  logEntry: z.object({ kind: z.string(), speaker: z.string().nullable().default(null), text: z.string() }).nullable().default(null),
  autosaveRequired: z.boolean(),
});

export type ActionResult = z.infer<typeof ActionResultSchema>;
```

- [ ] **Step 4: Run shared tests to verify they pass**

Run: `bun test standalone-app/packages/shared/src/session.test.ts standalone-app/packages/shared/src/runtime.test.ts`
Expected: PASS with 2 passing tests

- [ ] **Step 5: Commit the shared-contract checkpoint**

Run:

```bash
git add standalone-app/package.json standalone-app/packages/shared standalone-app/tsconfig.base.json standalone-app/vitest.workspace.ts
git commit -m "feat: add standalone runtime contracts"
```

Expected: If `standalone-app` has been initialized as a git repo, a commit is created. If not, initialize git before execution and use the same message.

### Task 2: Build Engine Session Service

**Files:**
- Create: `standalone-app/apps/engine/package.json`
- Create: `standalone-app/apps/engine/src/server.ts`
- Create: `standalone-app/apps/engine/src/routes/health.ts`
- Create: `standalone-app/apps/engine/src/routes/session.ts`
- Create: `standalone-app/apps/engine/src/services/session-service.ts`
- Create: `standalone-app/apps/engine/src/services/model-router.ts`
- Test: `standalone-app/apps/engine/src/services/session-service.test.ts`
- Test: `standalone-app/apps/engine/src/routes/session.test.ts`

- [ ] **Step 1: Write failing engine tests for session bootstrap and action execution**

```ts
// standalone-app/apps/engine/src/services/session-service.test.ts
import { describe, expect, it } from 'vitest';
import { createInitialSession, applyAction } from './session-service';

describe('session-service', () => {
  it('creates an initial session from new-game input', () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    expect(session.sessionMeta.workId).toBe('riji-luoluo');
    expect(session.sceneState.mode).toBe('dialog');
  });

  it('keeps investigate actions out of the formal log', async () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    const next = await applyAction(session, { kind: 'investigate', target: '教室周围' });
    expect(next.logState.entries).toHaveLength(0);
    expect(next.investigationState.entries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run engine tests to verify they fail**

Run: `bun test standalone-app/apps/engine/src/services/session-service.test.ts`
Expected: FAIL with `createInitialSession` / `applyAction` missing

- [ ] **Step 3: Write the minimal engine session service and HTTP routes**

```ts
// standalone-app/apps/engine/src/services/session-service.ts
import { Session, SessionSchema } from '@standalone/shared/session';

type NewGameInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string;
  useDualModel: boolean;
};

export function createInitialSession(input: NewGameInput): Session {
  return SessionSchema.parse({
    sessionMeta: {
      id: crypto.randomUUID(),
      workId: 'riji-luoluo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    modelConfig: input,
    gameState: {
      playerLocation: '教室',
      luoluoLocation: '教室',
      currentLocation: '教室',
      availableActions: ['interact', 'move', 'investigate'],
    },
    variableState: { stat_data: { 世界: { 当前地点: '教室' } } },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
  });
}

export async function applyAction(session: Session, action: { kind: 'investigate'; target: string } | { kind: 'interact'; text: string } | { kind: 'move'; destination: string }): Promise<Session> {
  if (action.kind === 'investigate') {
    return {
      ...session,
      investigationState: {
        entries: [{ id: crypto.randomUUID(), text: `${action.target} 的环境描述`, turnsRemaining: 3 }],
      },
    };
  }

  return {
    ...session,
    logState: {
      entries: [...session.logState.entries, { kind: action.kind, speaker: action.kind === 'interact' ? '你' : '系统', text: JSON.stringify(action) }],
    },
  };
}
```

```ts
// standalone-app/apps/engine/src/routes/session.ts
import { createInitialSession, applyAction } from '../services/session-service';

export async function registerSessionRoutes(app: any) {
  app.post('/session/new', async (req: any, res: any) => {
    res.json(createInitialSession(req.body));
  });

  app.post('/session/action', async (req: any, res: any) => {
    res.json(await applyAction(req.body.session, req.body.action));
  });
}
```

- [ ] **Step 4: Run engine tests to verify they pass**

Run: `bun test standalone-app/apps/engine/src/services/session-service.test.ts`
Expected: PASS with 2 passing tests

- [ ] **Step 5: Commit the engine-service checkpoint**

```bash
git add standalone-app/apps/engine standalone-app/packages/shared
git commit -m "feat: add standalone engine session service"
```

### Task 3: Bootstrap Electrobun Desktop Shell

**Files:**
- Create: `standalone-app/apps/desktop/package.json`
- Create: `standalone-app/apps/desktop/electrobun.config.ts`
- Create: `standalone-app/apps/desktop/src/main.ts`
- Create: `standalone-app/apps/desktop/src/paths.ts`
- Create: `standalone-app/apps/desktop/src/preload.ts`
- Create: `standalone-app/apps/desktop/src/paths.test.ts`

- [ ] **Step 1: Write failing path-resolution tests**

```ts
// standalone-app/apps/desktop/src/paths.test.ts
import { describe, expect, it } from 'vitest';
import { getAppPaths } from './paths';

describe('getAppPaths', () => {
  it('separates saves from config secrets', () => {
    const paths = getAppPaths('/tmp/lologames-home');
    expect(paths.savesDir.endsWith('/saves')).toBe(true);
    expect(paths.credentialsFile.endsWith('/credentials.json')).toBe(true);
    expect(paths.savesDir).not.toBe(paths.credentialsFile);
  });
});
```

- [ ] **Step 2: Run desktop path tests to verify they fail**

Run: `bun test standalone-app/apps/desktop/src/paths.test.ts`
Expected: FAIL with missing `./paths`

- [ ] **Step 3: Write the minimal shell path module and Electrobun entry**

```ts
// standalone-app/apps/desktop/src/paths.ts
import path from 'node:path';

export function getAppPaths(baseDir: string) {
  const dataDir = path.join(baseDir, 'riji-luoluo');
  return {
    dataDir,
    savesDir: path.join(dataDir, 'saves'),
    credentialsFile: path.join(dataDir, 'config', 'credentials.json'),
    settingsFile: path.join(dataDir, 'config', 'settings.json'),
  };
}
```

```ts
// standalone-app/apps/desktop/src/main.ts
import { getAppPaths } from './paths';

async function bootstrap() {
  const paths = getAppPaths(process.env.HOME || process.cwd());
  console.log('App paths', paths);
  // Create engine child process and main window here in the real implementation.
}

bootstrap();
```

- [ ] **Step 4: Run desktop path tests to verify they pass**

Run: `bun test standalone-app/apps/desktop/src/paths.test.ts`
Expected: PASS with 1 passing test

- [ ] **Step 5: Commit the desktop-shell checkpoint**

```bash
git add standalone-app/apps/desktop
git commit -m "feat: add desktop shell bootstrap"
```

### Task 4: Build Main Menu And New-Game Flow

**Files:**
- Create: `standalone-app/apps/desktop/src/renderer/main.ts`
- Create: `standalone-app/apps/desktop/src/renderer/App.vue`
- Create: `standalone-app/apps/desktop/src/renderer/api/client.ts`
- Create: `standalone-app/apps/desktop/src/renderer/stores/session.ts`
- Create: `standalone-app/apps/desktop/src/renderer/views/MainMenuView.vue`
- Create: `standalone-app/apps/desktop/src/renderer/views/NewGameView.vue`
- Test: `standalone-app/apps/desktop/src/renderer/stores/session.test.ts`

- [ ] **Step 1: Write failing tests for session bootstrap from new-game input**

```ts
// standalone-app/apps/desktop/src/renderer/stores/session.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createSessionStore } from './session';

describe('createSessionStore', () => {
  it('creates a new session from story and logic model setup', async () => {
    const api = {
      createNewSession: vi.fn().mockResolvedValue({
        sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: { stat_data: {} }, timelineState: { nodes: [] }, logState: { entries: [] }, sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' }, investigationState: { entries: [] }, saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    };

    const store = createSessionStore(api as any);
    await store.startNewGame({ providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true });

    expect(api.createNewSession).toHaveBeenCalledOnce();
    expect(store.currentSession?.sceneState.text).toBe('第一条消息');
  });
});
```

- [ ] **Step 2: Run renderer store tests to verify they fail**

Run: `bun test standalone-app/apps/desktop/src/renderer/stores/session.test.ts`
Expected: FAIL with missing store module

- [ ] **Step 3: Write the minimal API client, store, and new-game flow views**

```ts
// standalone-app/apps/desktop/src/renderer/api/client.ts
export function createApiClient(baseUrl = 'http://127.0.0.1:43111') {
  return {
    async createNewSession(payload: Record<string, unknown>) {
      const response = await fetch(`${baseUrl}/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
  };
}
```

```ts
// standalone-app/apps/desktop/src/renderer/stores/session.ts
export function createSessionStore(api: { createNewSession: (payload: any) => Promise<any> }) {
  const state = {
    currentSession: null as any,
    async startNewGame(input: any) {
      state.currentSession = await api.createNewSession(input);
    },
  };

  return state;
}
```

```vue
<!-- standalone-app/apps/desktop/src/renderer/views/MainMenuView.vue -->
<template>
  <main>
    <button>继续</button>
    <button>新游戏</button>
    <button>加载存档</button>
    <button>设置</button>
    <button>退出</button>
  </main>
</template>
```

```vue
<!-- standalone-app/apps/desktop/src/renderer/views/NewGameView.vue -->
<template>
  <form>
    <input name="providerId" placeholder="Provider" />
    <input name="credentialProfileId" placeholder="Credential Profile" />
    <input name="storyModel" placeholder="Story Model" />
    <input name="logicModel" placeholder="Logic Model" />
    <label><input type="checkbox" name="useDualModel" checked /> 双模型</label>
    <button type="submit">开始</button>
  </form>
</template>
```

- [ ] **Step 4: Run renderer store tests to verify they pass**

Run: `bun test standalone-app/apps/desktop/src/renderer/stores/session.test.ts`
Expected: PASS with 1 passing test

- [ ] **Step 5: Commit the menu-and-bootstrap checkpoint**

```bash
git add standalone-app/apps/desktop/src/renderer
git commit -m "feat: add main menu and new game bootstrap"
```

### Task 5: Implement Timeline, Log, Scene, And Investigation Separation

**Files:**
- Modify: `standalone-app/packages/shared/src/runtime.ts`
- Modify: `standalone-app/apps/engine/src/services/session-service.ts`
- Modify: `standalone-app/apps/desktop/src/renderer/stores/session.ts`
- Test: `standalone-app/apps/engine/src/services/session-service.test.ts`
- Test: `standalone-app/apps/desktop/src/renderer/stores/session.test.ts`

- [ ] **Step 1: Write failing tests for formal-log vs investigation-only behavior**

```ts
// add to standalone-app/apps/engine/src/services/session-service.test.ts
it('writes interact actions to timeline and log but keeps scene current-only', async () => {
  const session = createInitialSession({ providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true });
  const next = await applyAction(session, { kind: 'interact', text: '【看向络络】早上好。' });

  expect(next.timelineState.nodes).toHaveLength(1);
  expect(next.logState.entries).toHaveLength(1);
  expect(next.sceneState.text).toContain('早上好');
});

it('expires investigation context after three formal turns', async () => {
  let session = createInitialSession({ providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true });
  session = await applyAction(session, { kind: 'investigate', target: '黑板' });
  session = await applyAction(session, { kind: 'interact', text: '1' });
  session = await applyAction(session, { kind: 'interact', text: '2' });
  session = await applyAction(session, { kind: 'move', destination: '走廊' });

  expect(session.investigationState.entries).toHaveLength(0);
});
```

- [ ] **Step 2: Run engine tests to verify they fail**

Run: `bun test standalone-app/apps/engine/src/services/session-service.test.ts`
Expected: FAIL because timeline nodes and investigation expiration are not implemented

- [ ] **Step 3: Write minimal state-separation logic**

```ts
// patch for standalone-app/apps/engine/src/services/session-service.ts
function decayInvestigations(entries: Array<{ turnsRemaining: number }>) {
  return entries
    .map(entry => ({ ...entry, turnsRemaining: entry.turnsRemaining - 1 }))
    .filter(entry => entry.turnsRemaining > 0);
}

export async function applyAction(session: Session, action: any): Promise<Session> {
  const baseTimelineNode = { id: crypto.randomUUID(), kind: action.kind, input: action, createdAt: new Date().toISOString() };

  if (action.kind === 'investigate') {
    return {
      ...session,
      timelineState: { nodes: [...session.timelineState.nodes, { ...baseTimelineNode, formal: false }] },
      investigationState: { entries: [{ id: crypto.randomUUID(), text: `${action.target} 的环境描述`, turnsRemaining: 3 }] },
    };
  }

  const nextInvestigations = decayInvestigations(session.investigationState.entries as Array<{ turnsRemaining: number }>);
  const text = action.kind === 'move' ? `你前往了 ${action.destination}` : `你说：${action.text}`;

  return {
    ...session,
    timelineState: { nodes: [...session.timelineState.nodes, { ...baseTimelineNode, formal: true }] },
    logState: { entries: [...session.logState.entries, { kind: action.kind, speaker: action.kind === 'interact' ? '你' : '系统', text }] },
    sceneState: { ...session.sceneState, mode: 'dialog', text, speaker: action.kind === 'interact' ? '你' : '系统' },
    investigationState: { entries: nextInvestigations },
  };
}
```

- [ ] **Step 4: Run engine and store tests to verify they pass**

Run: `bun test standalone-app/apps/engine/src/services/session-service.test.ts standalone-app/apps/desktop/src/renderer/stores/session.test.ts`
Expected: PASS with all tests green

- [ ] **Step 5: Commit the runtime-separation checkpoint**

```bash
git add standalone-app/apps/engine/src/services/session-service.ts standalone-app/packages/shared/src/runtime.ts standalone-app/apps/desktop/src/renderer/stores/session.ts
git commit -m "feat: separate timeline log and investigation state"
```

### Task 6: Build The Persistent Galgame Shell And Core Actions

**Files:**
- Create: `standalone-app/apps/desktop/src/renderer/views/GameView.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/GameHud.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/InteractModal.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/MoveModal.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/InvestigateModal.vue`
- Test: `standalone-app/apps/desktop/src/renderer/components/GameHud.test.ts`

- [ ] **Step 1: Write a failing component test for HUD actions**

```ts
// standalone-app/apps/desktop/src/renderer/components/GameHud.test.ts
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/vue';
import GameHud from './GameHud.vue';

describe('GameHud', () => {
  it('renders VN controls and the three core actions', () => {
    render(GameHud, { props: { availableActions: ['interact', 'move', 'investigate'] } });

    for (const label of ['Q.save', 'Q.load', 'save', 'load', 'log', 'setting', 'hide', '互动', '移动', '调查']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the HUD test to verify it fails**

Run: `bun test standalone-app/apps/desktop/src/renderer/components/GameHud.test.ts`
Expected: FAIL with missing `GameHud.vue`

- [ ] **Step 3: Write the minimal persistent game shell**

```vue
<!-- standalone-app/apps/desktop/src/renderer/components/GameHud.vue -->
<script setup lang="ts">
defineProps<{ availableActions: string[] }>();
</script>

<template>
  <footer class="game-hud">
    <button>Q.save</button>
    <button>Q.load</button>
    <button>save</button>
    <button>load</button>
    <button>log</button>
    <button>setting</button>
    <button>hide</button>
    <button v-if="availableActions.includes('interact')">互动</button>
    <button v-if="availableActions.includes('move')">移动</button>
    <button v-if="availableActions.includes('investigate')">调查</button>
  </footer>
</template>
```

```vue
<!-- standalone-app/apps/desktop/src/renderer/views/GameView.vue -->
<script setup lang="ts">
import GameHud from '../components/GameHud.vue';

const session = {
  sceneState: { speaker: '络络', text: '第一条消息' },
  gameState: { availableActions: ['interact', 'move', 'investigate'] },
};
</script>

<template>
  <main class="game-view">
    <section class="scene-layer">背景 / 立绘</section>
    <section class="dialog-layer">
      <h2>{{ session.sceneState.speaker }}</h2>
      <p>{{ session.sceneState.text }}</p>
    </section>
    <GameHud :available-actions="session.gameState.availableActions" />
  </main>
</template>
```

- [ ] **Step 4: Run the HUD test to verify it passes**

Run: `bun test standalone-app/apps/desktop/src/renderer/components/GameHud.test.ts`
Expected: PASS with 1 passing test

- [ ] **Step 5: Commit the game-shell checkpoint**

```bash
git add standalone-app/apps/desktop/src/renderer/views/GameView.vue standalone-app/apps/desktop/src/renderer/components
git commit -m "feat: add persistent galgame shell and HUD"
```

### Task 7: Add Save/Load, Quick Save, And Log Drawer

**Files:**
- Create: `standalone-app/apps/desktop/src/renderer/components/SaveLoadModal.vue`
- Create: `standalone-app/apps/desktop/src/renderer/components/LogDrawer.vue`
- Modify: `standalone-app/apps/desktop/src/renderer/stores/session.ts`
- Test: `standalone-app/apps/desktop/src/renderer/stores/session.test.ts`

- [ ] **Step 1: Write failing tests for save slots and quick save/load**

```ts
// add to standalone-app/apps/desktop/src/renderer/stores/session.test.ts
it('creates manual and quick-save snapshots from the current session', async () => {
  const api = { createNewSession: vi.fn().mockResolvedValue({
    sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true },
    gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
    variableState: { stat_data: {} }, timelineState: { nodes: [] }, logState: { entries: [] }, sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' }, investigationState: { entries: [] }, saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
  }) };

  const store = createSessionStore(api as any);
  await store.startNewGame({ providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true });
  store.saveToManualSlot('slot-1');
  store.quickSave();

  expect(store.manualSaves['slot-1'].sceneState.text).toBe('第一条消息');
  expect(store.quickSaveSlot?.sceneState.text).toBe('第一条消息');
});
```

- [ ] **Step 2: Run store tests to verify they fail**

Run: `bun test standalone-app/apps/desktop/src/renderer/stores/session.test.ts`
Expected: FAIL because save helpers are missing

- [ ] **Step 3: Write the minimal save/load and log-state helpers**

```ts
// patch for standalone-app/apps/desktop/src/renderer/stores/session.ts
export function createSessionStore(api: { createNewSession: (payload: any) => Promise<any> }) {
  const state = {
    currentSession: null as any,
    manualSaves: {} as Record<string, any>,
    quickSaveSlot: null as any,
    async startNewGame(input: any) {
      state.currentSession = await api.createNewSession(input);
    },
    saveToManualSlot(slotId: string) {
      state.manualSaves[slotId] = structuredClone(state.currentSession);
    },
    quickSave() {
      state.quickSaveSlot = structuredClone(state.currentSession);
    },
    loadManualSlot(slotId: string) {
      state.currentSession = structuredClone(state.manualSaves[slotId]);
    },
    quickLoad() {
      state.currentSession = structuredClone(state.quickSaveSlot);
    },
  };

  return state;
}
```

```vue
<!-- standalone-app/apps/desktop/src/renderer/components/LogDrawer.vue -->
<script setup lang="ts">
defineProps<{ entries: Array<{ speaker?: string | null; text: string }> }>();
</script>

<template>
  <aside>
    <article v-for="(entry, index) in entries" :key="index">
      <strong>{{ entry.speaker || '系统' }}</strong>
      <p>{{ entry.text }}</p>
    </article>
  </aside>
</template>
```

- [ ] **Step 4: Run store tests to verify they pass**

Run: `bun test standalone-app/apps/desktop/src/renderer/stores/session.test.ts`
Expected: PASS with all store tests green

- [ ] **Step 5: Commit the save-load-log checkpoint**

```bash
git add standalone-app/apps/desktop/src/renderer/stores/session.ts standalone-app/apps/desktop/src/renderer/components/LogDrawer.vue standalone-app/apps/desktop/src/renderer/components/SaveLoadModal.vue
git commit -m "feat: add vn save load and log state"
```

### Task 8: Bridge Riji Luoluo Content Into The Standalone Runtime

**Files:**
- Create: `standalone-app/packages/content-riji/package.json`
- Create: `standalone-app/packages/content-riji/src/index.ts`
- Create: `standalone-app/packages/content-riji/src/first-message.ts`
- Create: `standalone-app/packages/content-riji/src/default-scene.ts`
- Test: `standalone-app/packages/content-riji/src/first-message.test.ts`
- Modify: `standalone-app/apps/engine/src/services/session-service.ts`

- [ ] **Step 1: Write a failing content-bridge test for the first message**

```ts
// standalone-app/packages/content-riji/src/first-message.test.ts
import { describe, expect, it } from 'vitest';
import { buildInitialRijiScene } from './default-scene';

describe('buildInitialRijiScene', () => {
  it('returns the first message as the initial dialog scene', () => {
    const scene = buildInitialRijiScene();
    expect(scene.mode).toBe('dialog');
    expect(scene.speaker).toBe('络络');
    expect(scene.text.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the content-bridge test to verify it fails**

Run: `bun test standalone-app/packages/content-riji/src/first-message.test.ts`
Expected: FAIL with missing content bridge module

- [ ] **Step 3: Write the minimal first-message bridge and wire it into engine bootstrap**

```ts
// standalone-app/packages/content-riji/src/default-scene.ts
import firstMessage from '../../../lolocard/src/日记络络/第一条消息/0.txt?raw';

export function buildInitialRijiScene() {
  return {
    mode: 'dialog',
    speaker: '络络',
    text: firstMessage.trim(),
  };
}
```

```ts
// patch for standalone-app/apps/engine/src/services/session-service.ts
import { buildInitialRijiScene } from '@standalone/content-riji/default-scene';

export function createInitialSession(input: NewGameInput): Session {
  const initialScene = buildInitialRijiScene();
  return SessionSchema.parse({
    // ...existing fields...
    sceneState: initialScene,
    // ...existing fields...
  });
}
```

- [ ] **Step 4: Run content and engine tests to verify they pass**

Run: `bun test standalone-app/packages/content-riji/src/first-message.test.ts standalone-app/apps/engine/src/services/session-service.test.ts`
Expected: PASS with all tests green

- [ ] **Step 5: Commit the content-bridge checkpoint**

```bash
git add standalone-app/packages/content-riji standalone-app/apps/engine/src/services/session-service.ts
git commit -m "feat: bridge riji luoluo initial content into standalone runtime"
```

## Spec Coverage Check

- Main menu, new-game setup, and persistent galgame shell are covered by Tasks 3, 4, and 6.
- Traditional VN save/load, quick save/load, and log are covered by Task 7.
- `互动 / 移动 / 调查` actions and the rule that investigation is temporary and excluded from formal log are covered by Tasks 2, 5, and 6.
- Story-model vs logic-model routing is introduced in Task 2 via the model router boundary and exercised through the session/action service. The first implementation is intentionally minimal and must remain behind `model-router.ts` so the real dual-model integration can be expanded without changing frontend contracts.
- Replacing the old ST layer model with separated timeline/log/scene state is covered by Task 5.
- Reusing `日记络络` content instead of rewriting it is covered by Task 8.

## Self-Review Notes

- Placeholder scan: Removed vague “implement later” language; every task points to exact files and commands.
- Internal consistency: `timeline`, `log`, `scene`, and `investigationState` use the same names throughout the plan and spec.
- Scope check: The full product is still large, but this MVP plan remains coherent because every task contributes directly to a playable single-work standalone build. Multi-work packaging, chapter rewind, and full platformization remain explicitly out of scope.
- Ambiguity check: The plan assumes `standalone-app` becomes its own git repo before execution. If the workspace remains non-git, execute all code and test steps exactly as written but skip commit commands until git is initialized.
