# Renderer Auto-Start First Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically start a new game from complete default renderer settings so the desktop app opens into a real first-frame scene instead of the empty-state shell.

**Architecture:** Add one pure helper that converts `AppSettings` into a valid `startNewGame()` payload or `null`, then extend `sessionStore` with minimal bootstrap status so the renderer can distinguish idle, starting, and failed auto-start states. Trigger auto-start exactly once from the renderer startup boundary in `index.ts`, while keeping `App.ts` purely render-focused.

**Tech Stack:** TypeScript, Vue 3, Vitest, Electrobun, Bun

---

## File Structure

- Create: `apps/desktop/src/renderer/default-new-game.ts`
  - Pure parser from `AppSettings` to `NewGameInput | null`.
- Create: `apps/desktop/src/renderer/default-new-game.test.ts`
  - Focused tests for valid single-model, valid dual-model, and invalid default settings.
- Modify: `apps/desktop/src/renderer/stores/session.ts`
  - Add minimal bootstrap state and `startNewGameFromDefaults(appSettings)`.
- Modify: `apps/desktop/src/renderer/stores/session.test.ts`
  - Cover starting/success/error/no-op behavior plus existing session reactivity.
- Modify: `apps/desktop/src/renderer/App.ts`
  - Render startup-empty, startup-progress, and startup-error text from session store state.
- Modify: `apps/desktop/src/renderer/App.test.ts`
  - Verify rendering for idle empty, starting, error, and ready states.
- Modify: `apps/desktop/src/renderer/index.ts`
  - Trigger auto-start once when startup conditions are met.
- Modify: `apps/desktop/src/renderer/index.test.ts`
  - Verify auto-start on complete defaults, no auto-start on existing session, and no auto-start on incomplete defaults.

### Task 1: Parse Default Settings Into A New-Game Payload

**Files:**
- Create: `apps/desktop/src/renderer/default-new-game.ts`
- Test: `apps/desktop/src/renderer/default-new-game.test.ts`

- [ ] **Step 1: Write the failing parser tests**

```ts
import type { AppSettings } from '../config-store';
import { describe, expect, it } from 'vitest';

import { getDefaultNewGameInput } from './default-new-game';

function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    defaultProviderId: 'openai-compatible',
    defaultCredentialProfileId: 'default',
    defaultStoryModel: 'story-001',
    defaultLogicModel: null,
    useDualModel: false,
    ...overrides,
  };
}

describe('getDefaultNewGameInput', () => {
  it('returns a single-model payload when required defaults are present', () => {
    expect(getDefaultNewGameInput(createSettings())).toEqual({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
    });
  });

  it('returns a dual-model payload when logic defaults are complete', () => {
    expect(
      getDefaultNewGameInput(
        createSettings({
          useDualModel: true,
          defaultLogicModel: 'logic-001',
        }),
      ),
    ).toEqual({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });
  });

  it('returns null when defaults are incomplete', () => {
    expect(getDefaultNewGameInput(createSettings({ defaultStoryModel: null }))).toBeNull();
    expect(getDefaultNewGameInput(createSettings({ useDualModel: true, defaultLogicModel: null }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the parser tests to verify they fail**

Run: `npx vitest run apps/desktop/src/renderer/default-new-game.test.ts`

Expected: FAIL with module resolution error for `./default-new-game`

- [ ] **Step 3: Write the minimal parser implementation**

```ts
import type { AppSettings } from '../config-store';

type NewGameInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
};

export function getDefaultNewGameInput(settings: AppSettings): NewGameInput | null {
  if (!settings.defaultProviderId || !settings.defaultCredentialProfileId || !settings.defaultStoryModel) {
    return null;
  }

  if (settings.useDualModel && !settings.defaultLogicModel) {
    return null;
  }

  return {
    providerId: settings.defaultProviderId,
    credentialProfileId: settings.defaultCredentialProfileId,
    storyModel: settings.defaultStoryModel,
    logicModel: settings.useDualModel ? settings.defaultLogicModel : null,
    useDualModel: settings.useDualModel,
  };
}
```

- [ ] **Step 4: Run the parser tests to verify they pass**

Run: `npx vitest run apps/desktop/src/renderer/default-new-game.test.ts`

Expected: PASS with `3 passed`

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 2: Add Session Bootstrap State And Default Auto-Start Logic

**Files:**
- Modify: `apps/desktop/src/renderer/stores/session.ts`
- Modify: `apps/desktop/src/renderer/stores/session.test.ts`
- Read for context: `apps/desktop/src/renderer/default-new-game.ts`

- [ ] **Step 1: Write the failing bootstrap-state tests**

Add tests like these to `apps/desktop/src/renderer/stores/session.test.ts`:

```ts
it('starts a new game from complete defaults and clears bootstrap state on success', async () => {
  const api = createApi({
    createNewSession: vi.fn().mockResolvedValue(
      createTestSession({
        sceneState: { mode: 'dialog', text: '第一条真实首帧', speaker: '络络' },
      }),
    ),
  });

  const store = createSessionStore(api);
  const start = store.startNewGameFromDefaults({
    defaultProviderId: 'openai-compatible',
    defaultCredentialProfileId: 'default',
    defaultStoryModel: 'story-001',
    defaultLogicModel: null,
    useDualModel: false,
  });

  expect(store.bootstrapState).toBe('starting');
  await start;
  expect(api.createNewSession).toHaveBeenCalledWith({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: null,
    useDualModel: false,
  });
  expect(store.bootstrapState).toBe('idle');
  expect(store.bootstrapError).toBeNull();
  expect(store.currentSession?.sceneState.text).toBe('第一条真实首帧');
});

it('records bootstrap errors when automatic start fails', async () => {
  const api = createApi({
    createNewSession: vi.fn().mockRejectedValue(new Error('boom')),
  });
  const store = createSessionStore(api);

  await store.startNewGameFromDefaults({
    defaultProviderId: 'openai-compatible',
    defaultCredentialProfileId: 'default',
    defaultStoryModel: 'story-001',
    defaultLogicModel: null,
    useDualModel: false,
  });

  expect(store.bootstrapState).toBe('error');
  expect(store.bootstrapError).toBe('boom');
  expect(store.currentSession).toBeNull();
});

it('does nothing when defaults are incomplete', async () => {
  const api = createApi();
  const store = createSessionStore(api);

  await store.startNewGameFromDefaults({
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
  });

  expect(api.createNewSession).not.toHaveBeenCalled();
  expect(store.bootstrapState).toBe('idle');
  expect(store.bootstrapError).toBeNull();
});
```

- [ ] **Step 2: Run the session-store tests to verify they fail**

Run: `npx vitest run apps/desktop/src/renderer/stores/session.test.ts`

Expected: FAIL because `bootstrapState`, `bootstrapError`, and `startNewGameFromDefaults` do not exist yet

- [ ] **Step 3: Implement the minimal session bootstrap state**

Update `apps/desktop/src/renderer/stores/session.ts` to import the parser and add the new state/method:

```ts
import { reactive } from 'vue';
import { parseSession, type Session } from '@lologames/shared';

import { getDefaultNewGameInput } from '../default-new-game';

// keep NewGameInput as-is

export function createSessionStore(api: ApiInterface) {
  const state = reactive({
    currentSession: null as Session | null,
    bootstrapState: 'idle' as 'idle' | 'starting' | 'error',
    bootstrapError: null as string | null,
    receiveSession(session: unknown) {
      state.currentSession = parseSession(session);
    },
    async startNewGame(input: NewGameInput) {
      state.receiveSession(await api.createNewSession(input));
    },
    async startNewGameFromDefaults(appSettings: {
      defaultProviderId: string | null;
      defaultCredentialProfileId: string | null;
      defaultStoryModel: string | null;
      defaultLogicModel: string | null;
      useDualModel: boolean;
    }) {
      const input = getDefaultNewGameInput(appSettings);

      if (!input) {
        return;
      }

      state.bootstrapState = 'starting';
      state.bootstrapError = null;

      try {
        await state.startNewGame(input);
        state.bootstrapState = 'idle';
      } catch (error) {
        state.bootstrapState = 'error';
        state.bootstrapError = error instanceof Error ? error.message : String(error);
      }
    },
    // keep quickSave/saveToManualSlot/quickLoad/loadManualSlot unchanged
  });

  return state;
}
```

- [ ] **Step 4: Run the session-store tests to verify they pass**

Run: `npx vitest run apps/desktop/src/renderer/stores/session.test.ts apps/desktop/src/renderer/default-new-game.test.ts`

Expected: PASS with all store and parser tests green

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 3: Trigger Auto-Start At Renderer Boot And Render Status Text

**Files:**
- Modify: `apps/desktop/src/renderer/index.ts`
- Modify: `apps/desktop/src/renderer/index.test.ts`
- Modify: `apps/desktop/src/renderer/App.ts`
- Modify: `apps/desktop/src/renderer/App.test.ts`
- Re-run: `apps/desktop/src/renderer/game-scene-view-model.test.ts`

- [ ] **Step 1: Write the failing renderer-boot tests**

Update `apps/desktop/src/renderer/index.test.ts` with two new cases:

```ts
it('starts a new game automatically when defaults are complete and there is no session', async () => {
  const startNewGameFromDefaults = vi.fn().mockResolvedValue(undefined);
  const sessionStore = {
    currentSession: null,
    startNewGameFromDefaults,
  };

  bootstrapElectrobunRenderer.mockResolvedValue({
    App: 'AppStub',
    configStore: {
      credentialProfiles: [],
      appSettings: {
        defaultProviderId: 'openai-compatible',
        defaultCredentialProfileId: 'default',
        defaultStoryModel: 'story-001',
        defaultLogicModel: null,
        useDualModel: false,
      },
    },
    sessionStore,
  });

  // stub document / HTMLElement, import index, flush promises

  expect(startNewGameFromDefaults).toHaveBeenCalledWith({
    defaultProviderId: 'openai-compatible',
    defaultCredentialProfileId: 'default',
    defaultStoryModel: 'story-001',
    defaultLogicModel: null,
    useDualModel: false,
  });
});

it('does not auto-start when a session already exists', async () => {
  const startNewGameFromDefaults = vi.fn().mockResolvedValue(undefined);
  const sessionStore = {
    currentSession: { sceneState: { mode: 'dialog', speaker: '络络', text: '已有存档' } },
    startNewGameFromDefaults,
  };

  bootstrapElectrobunRenderer.mockResolvedValue({
    App: 'AppStub',
    configStore: {
      credentialProfiles: [],
      appSettings: {
        defaultProviderId: 'openai-compatible',
        defaultCredentialProfileId: 'default',
        defaultStoryModel: 'story-001',
        defaultLogicModel: null,
        useDualModel: false,
      },
    },
    sessionStore,
  });

  // stub document / HTMLElement, import index, flush promises

  expect(startNewGameFromDefaults).not.toHaveBeenCalled();
});
```

Also update `apps/desktop/src/renderer/App.test.ts` with status rendering expectations:

```ts
it('renders a startup message while automatic new-game bootstrap is running', () => {
  const output = renderAppWithSessionStore({
    currentSession: null,
    bootstrapState: 'starting',
    bootstrapError: null,
  });

  expect(output).toContain('正在进入新的游戏');
  expect(output).not.toContain('name-text');
});

it('renders a readable error state when automatic new-game bootstrap fails', () => {
  const output = renderAppWithSessionStore({
    currentSession: null,
    bootstrapState: 'error',
    bootstrapError: 'boom',
  });

  expect(output).toContain('自动开始新游戏失败');
  expect(output).toContain('boom');
});
```

- [ ] **Step 2: Run the renderer tests to verify they fail**

Run: `npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/App.test.ts`

Expected: FAIL because `index.ts` does not trigger auto-start and `App.ts` does not branch on bootstrap state

- [ ] **Step 3: Implement the minimal renderer wiring and status rendering**

Update `apps/desktop/src/renderer/index.ts` so the success path becomes:

```ts
void bootstrapElectrobunRenderer({
  Electroview,
})
  .then(async ({ App, configStore, sessionStore }) => {
    if (!sessionStore.currentSession) {
      await sessionStore.startNewGameFromDefaults(configStore.appSettings);
    }

    renderStartupStatus('createApp');
    const app = createApp(App, {
      sessionStore,
    });

    renderStartupStatus('mount');
    app.mount('#app');
  })
```

Update `apps/desktop/src/renderer/App.ts` so the text source becomes:

```ts
const scene = createGameSceneViewModel((this.sessionStore as SessionStore).currentSession);

let speaker = scene.speaker;
let text = scene.text;

if (!scene.speaker && (this.sessionStore as SessionStore).bootstrapState === 'starting') {
  text = '正在进入新的游戏...';
}

if (!scene.speaker && (this.sessionStore as SessionStore).bootstrapState === 'error') {
  text = `自动开始新游戏失败：${(this.sessionStore as SessionStore).bootstrapError ?? '未知错误'}`;
}

if (!scene.speaker && (this.sessionStore as SessionStore).bootstrapState === 'idle' && !scene.text) {
  text = '当前还没有进行中的游戏，也没有可用于自动开局的默认配置。';
}
```

And adjust `createGameSceneViewModel(null)` to return empty text `''` if needed so `App.ts` owns the three empty/start/error variants. If you take this route, update the mapper and its tests in the same task.

- [ ] **Step 4: Run the focused renderer verification suite**

Run: `npx vitest run apps/desktop/src/renderer/default-new-game.test.ts apps/desktop/src/renderer/stores/session.test.ts apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/App.test.ts apps/desktop/src/renderer/game-scene-view-model.test.ts apps/desktop/src/renderer/main-wrapper.test.ts apps/desktop/src/renderer/index-html.test.ts`

Expected: PASS with all listed files green

- [ ] **Step 5: Run full repository verification**

Run: `npm test`

Expected: PASS with all repository tests green and `typecheck:test-contracts` succeeding

- [ ] **Step 6: Run renderer build verification**

Run: `& "D:\claude-standalone-app\node_modules\electrobun\dist-win-x64\bun.exe" build "src/renderer/index.ts" --outdir ".electrobun-debug\renderer" --target browser`

Expected output includes:

```text
index.js
index.css
bg-classroom-....jpg
char-luoluo-....png
```

- [ ] **Step 7: Run a dev launch smoke test**

Run: `npx electrobun dev`

Expected output includes requests for:

```text
views\renderer\index.html
views\renderer\index.css
views\renderer\index.js
```

And with complete default settings present locally, the app should transition into the first-frame scene instead of the empty-state message.

- [ ] **Step 8: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

## Spec Coverage Check

- 从默认配置推导 new-game payload：Task 1
- session bootstrap state 与错误状态：Task 2
- 启动边界自动开局：Task 3
- App 启动中/失败/配置缺失文案：Task 3
- 全链路验证：Task 3
