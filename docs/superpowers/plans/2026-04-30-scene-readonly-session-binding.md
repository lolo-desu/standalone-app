# Scene Readonly Session Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-game renderer scene read its speaker/text from `sessionStore.currentSession` while preserving the approved visual shell and showing a stable empty state when no session exists.

**Architecture:** Add one thin pure mapping module that converts `Session | null` into a small `GameSceneViewModel`, then update the root renderer `App` to render from that model instead of hardcoded prototype text. Pass `sessionStore` into the Vue root app as props from `index.ts`, keeping engine contracts and store APIs unchanged.

**Tech Stack:** TypeScript, Vue 3 runtime render functions, Vitest, Electrobun, Bun

---

## File Structure

- Create: `apps/desktop/src/renderer/game-scene-view-model.ts`
  - Pure mapping from `Session | null` to renderer-ready readonly scene data.
- Create: `apps/desktop/src/renderer/game-scene-view-model.test.ts`
  - Focused tests for empty state, ready state, and date fallback behavior.
- Create: `apps/desktop/src/renderer/App.test.ts`
  - Verifies the root `App` renders ready and empty states from a provided `sessionStore`.
- Modify: `apps/desktop/src/renderer/App.ts`
  - Accept `sessionStore` prop, derive readonly scene model, and render from it.
- Modify: `apps/desktop/src/renderer/index.ts`
  - Pass `sessionStore` into `createApp(App, { sessionStore })`.
- Modify: `apps/desktop/src/renderer/index.test.ts`
  - Lock the root-prop wiring regression by expecting `sessionStore` to be passed into `createApp`.

## Task 1: Add A Pure Scene View Model Mapper

**Files:**
- Create: `apps/desktop/src/renderer/game-scene-view-model.ts`
- Test: `apps/desktop/src/renderer/game-scene-view-model.test.ts`

- [ ] **Step 1: Write the failing mapper tests**

```ts
import { describe, expect, it } from 'vitest';

import { createGameSceneViewModel } from './game-scene-view-model';

function createSession(overrides: Record<string, unknown> = {}) {
  return {
    sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'story', logicModel: null, useDualModel: false },
    gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
    ...overrides,
  };
}

describe('createGameSceneViewModel', () => {
  it('returns an empty-state model when there is no active session', () => {
    expect(createGameSceneViewModel(null)).toEqual({
      state: 'empty',
      dateLabel: '四月十七日 - 放学后',
      speaker: null,
      text: '当前还没有进行中的游戏。',
    });
  });

  it('maps speaker and body text from the current session scene state', () => {
    expect(createGameSceneViewModel(createSession())).toEqual({
      state: 'ready',
      dateLabel: '四月十七日 - 放学后',
      speaker: '络络',
      text: '第一条消息',
    });
  });

  it('falls back to the accepted date label when no stable date field is present', () => {
    const session = createSession({
      variableState: { stat_data: { 世界: { 当前地点: '教室' } } },
    });

    expect(createGameSceneViewModel(session).dateLabel).toBe('四月十七日 - 放学后');
  });
});
```

- [ ] **Step 2: Run the mapper tests to verify they fail**

Run: `npx vitest run apps/desktop/src/renderer/game-scene-view-model.test.ts`

Expected: FAIL with module resolution error for `./game-scene-view-model`

- [ ] **Step 3: Write the minimal mapper implementation**

```ts
import type { Session } from '@lologames/shared';

export type GameSceneViewModel = {
  state: 'empty' | 'ready';
  dateLabel: string;
  speaker: string | null;
  text: string;
};

const DEFAULT_DATE_LABEL = '四月十七日 - 放学后';
const EMPTY_STATE_TEXT = '当前还没有进行中的游戏。';

export function createGameSceneViewModel(session: Session | null): GameSceneViewModel {
  if (!session) {
    return {
      state: 'empty',
      dateLabel: DEFAULT_DATE_LABEL,
      speaker: null,
      text: EMPTY_STATE_TEXT,
    };
  }

  return {
    state: 'ready',
    dateLabel: DEFAULT_DATE_LABEL,
    speaker: session.sceneState.speaker,
    text: session.sceneState.text,
  };
}
```

- [ ] **Step 4: Run the mapper tests to verify they pass**

Run: `npx vitest run apps/desktop/src/renderer/game-scene-view-model.test.ts`

Expected: PASS with `3 passed`

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

## Task 2: Render The Root App From Session Data

**Files:**
- Modify: `apps/desktop/src/renderer/App.ts`
- Create: `apps/desktop/src/renderer/App.test.ts`
- Read for context: `apps/desktop/src/renderer/app.css`

- [ ] **Step 1: Write the failing App rendering tests**

```ts
import { describe, expect, it } from 'vitest';

import App from './App';

function renderApp(session: unknown) {
  const vnode = (App as { render: () => unknown }).render.call({
    sessionStore: {
      currentSession: session,
    },
  });

  return JSON.stringify(vnode);
}

describe('App', () => {
  it('renders speaker and scene text from the current session', () => {
    const output = renderApp({
      sceneState: {
        speaker: '络络',
        text: '现在终于不是硬编码文案了。',
      },
    });

    expect(output).toContain('络络');
    expect(output).toContain('现在终于不是硬编码文案了。');
  });

  it('renders an empty-state message when no session exists', () => {
    const output = renderApp(null);

    expect(output).toContain('当前还没有进行中的游戏。');
  });
});
```

- [ ] **Step 2: Run the App tests to verify they fail for the right reason**

Run: `npx vitest run apps/desktop/src/renderer/App.test.ts`

Expected: FAIL because `App.ts` still renders hardcoded prototype strings and does not read `sessionStore`

- [ ] **Step 3: Update the root App to consume the scene view model**

```ts
import { defineComponent, h } from 'vue';

import './app.css';
import { createGameSceneViewModel } from './game-scene-view-model';

export default defineComponent({
  name: 'App',
  props: {
    sessionStore: {
      type: Object,
      required: true,
    },
  },
  render() {
    const scene = createGameSceneViewModel(
      this.sessionStore.currentSession as Parameters<typeof createGameSceneViewModel>[0],
    );

    return h('main', { class: 'app-shell' }, [
      h('div', { class: 'prototype-container' }, [
        h('div', { class: 'background-image' }),
        h('div', { class: 'character-portrait' }),
        h('div', { class: 'vertical-date' }, [
          h('div', { class: 'text' }, scene.dateLabel),
        ]),
        h('div', { class: 'bottom-area' }, [
          scene.speaker ? h('div', { class: 'name-text' }, scene.speaker) : null,
          h('div', { class: 'text-content' }, scene.text),
          h('div', { class: 'bottom-widgets' }, [
            h('div', { class: 'widget' }, 'AUTO'),
            h('div', { class: 'widget' }, 'SKIP'),
            h('div', { class: 'widget' }, 'LOG'),
            h('div', { class: 'widget' }, 'MENU'),
          ]),
        ]),
      ]),
    ]);
  },
});
```

- [ ] **Step 4: Run the App tests to verify they pass**

Run: `npx vitest run apps/desktop/src/renderer/App.test.ts apps/desktop/src/renderer/game-scene-view-model.test.ts`

Expected: PASS with `5 passed`

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

## Task 3: Pass Session Store Into The Root App And Lock The Wiring

**Files:**
- Modify: `apps/desktop/src/renderer/index.ts`
- Modify: `apps/desktop/src/renderer/index.test.ts`
- Re-run: `apps/desktop/src/renderer/main-wrapper.test.ts`
- Re-run: `apps/desktop/src/renderer/index-html.test.ts`

- [ ] **Step 1: Write the failing root-wiring assertion in `index.test.ts`**

Update the existing happy-path test expectation to require the root props:

```ts
const sessionStore = {
  currentSession: null,
};

bootstrapElectrobunRenderer.mockResolvedValue({
  App: 'AppStub',
  configStore: {
    credentialProfiles: [],
    appSettings: {
      defaultProviderId: null,
      defaultCredentialProfileId: null,
      defaultStoryModel: null,
      defaultLogicModel: null,
      useDualModel: false,
    },
  },
  sessionStore,
});

expect(createApp).toHaveBeenCalledWith('AppStub', {
  sessionStore,
});
```

- [ ] **Step 2: Run the root-wiring test to verify it fails**

Run: `npx vitest run apps/desktop/src/renderer/index.test.ts`

Expected: FAIL because `index.ts` still calls `createApp(App)` without props

- [ ] **Step 3: Make the minimal root-wiring implementation change**

```ts
void bootstrapElectrobunRenderer({
  Electroview,
})
  .then(({ App, sessionStore }) => {
    renderStartupStatus('createApp');
    const app = createApp(App, {
      sessionStore,
    });

    renderStartupStatus('mount');
    app.mount('#app');
  })
```

- [ ] **Step 4: Run focused renderer regressions**

Run: `npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/App.test.ts apps/desktop/src/renderer/game-scene-view-model.test.ts apps/desktop/src/renderer/main-wrapper.test.ts apps/desktop/src/renderer/index-html.test.ts`

Expected: PASS with all listed test files green

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

- [ ] **Step 8: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

## Spec Coverage Check

- 场景文本从 `currentSession` 映射而来：Task 1, Task 2
- 无 session 时显示稳定空状态：Task 1, Task 2
- 保持当前视觉壳：Task 2
- 不修改 engine/shared contract：Task 1, Task 3
- 完整验证链路：Task 3
