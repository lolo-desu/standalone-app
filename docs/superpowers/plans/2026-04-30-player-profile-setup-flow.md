# Player Profile Setup Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace renderer auto-start on empty state with a lightweight player profile setup flow that collects `姓名` / `性别` / `自定义人设`, remembers the last used name locally, and writes the full profile into `session.variableState.stat_data.玩家` when a new game starts.

**Architecture:** Keep player identity as session-owned runtime state by extending the `/session/new` payload with `playerProfile` and having the engine initialize `stat_data.玩家`. On the desktop side, extend app settings with `lastPlayerName`, show a setup form when there is no current session, and submit the profile through the existing session store/bootstrap path instead of auto-starting immediately.

**Tech Stack:** TypeScript, Vue 3, Vitest, Electrobun, Bun, Zod

---

## Scope

This plan covers only **Phase 1** from `docs/superpowers/specs/2026-04-30-player-profile-and-prompt-template-design.md`.

It intentionally does **not** implement:

- prompt template JSON import/export
- `{{变量路径}}` interpolation
- built-in prompt block resolution
- prompt builder / provider adapter runtime

Those should be written as a separate follow-up plan after this flow is working end-to-end.

## File Structure

- Modify: `apps/desktop/src/config-store.ts`
  - Extend `AppSettings` with `lastPlayerName` and preserve backward compatibility for old settings files.
- Modify: `apps/desktop/src/config-store.test.ts`
  - Lock default/fallback/persisted behavior for `lastPlayerName`.
- Modify: `apps/desktop/src/renderer/stores/config.ts`
  - Extend renderer-side default settings state with `lastPlayerName`.
- Modify: `apps/desktop/src/renderer/stores/config.test.ts`
  - Verify preload hydration/save behavior includes `lastPlayerName`.
- Modify: `apps/engine/src/services/session-service.ts`
  - Accept `playerProfile` during session creation and write `stat_data.玩家`.
- Modify: `apps/engine/src/services/session-service.test.ts`
  - Verify the created session contains `玩家.姓名/性别/人设`.
- Modify: `apps/engine/src/routes/session.ts`
  - Extend `/session/new` payload schema with `playerProfile`.
- Modify: `apps/engine/src/routes/session.test.ts`
  - Verify valid/invalid route payloads with `playerProfile`.
- Modify: `apps/desktop/src/renderer/stores/session.ts`
  - Add a profile-aware new-game entrypoint while preserving bootstrap status handling.
- Modify: `apps/desktop/src/renderer/stores/session.test.ts`
  - Verify the profile payload is forwarded and duplicate-start guards still work.
- Modify: `apps/desktop/src/renderer/api/client.test.ts`
  - Verify `/session/new` request now includes `playerProfile`.
- Modify: `apps/desktop/src/renderer/main.test.ts`
  - Keep the bootstrapped API path covered with the expanded payload.
- Modify: `apps/desktop/src/renderer/App.ts`
  - Replace the empty-state shell with a lightweight setup form when there is no session.
- Modify: `apps/desktop/src/renderer/App.test.ts`
  - Verify setup rendering, prefill, submit callback wiring, starting/error states, and ready scene rendering.
- Modify: `apps/desktop/src/renderer/index.ts`
  - Stop auto-starting a new game on bare startup.
- Modify: `apps/desktop/src/renderer/index.test.ts`
  - Verify empty startup now mounts the setup state instead of calling `startNewGameFromDefaults`.

### Task 1: Add `lastPlayerName` To Desktop App Settings

**Files:**
- Modify: `apps/desktop/src/config-store.ts`
- Modify: `apps/desktop/src/config-store.test.ts`
- Modify: `apps/desktop/src/renderer/stores/config.ts`
- Modify: `apps/desktop/src/renderer/stores/config.test.ts`

- [ ] **Step 1: Write the failing config-store tests**

Add these tests to `apps/desktop/src/config-store.test.ts`:

```ts
  it('includes lastPlayerName in the default app settings shape', () => {
    return withTempConfigStore(({ store }) => {
      expect(store.loadAppSettings()).toEqual({
        defaultProviderId: null,
        defaultCredentialProfileId: null,
        defaultStoryModel: null,
        defaultLogicModel: null,
        useDualModel: false,
        lastPlayerName: null,
      });
    });
  });

  it('persists lastPlayerName alongside app settings', () => {
    const settings: AppSettings = {
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: null,
      useDualModel: false,
      lastPlayerName: '林明霜',
    };

    return withTempConfigStore(({ store }) => {
      store.saveAppSettings(settings);
      expect(store.loadAppSettings()).toEqual(settings);
    });
  });

  it('falls back to null lastPlayerName when older settings files omit it', () => {
    return withTempConfigStore(({ store, settingsFile }) => {
      mkdirSync(path.dirname(settingsFile), { recursive: true });
      writeFileSync(settingsFile, JSON.stringify({
        defaultProviderId: 'openai-compatible',
        defaultCredentialProfileId: 'default',
        defaultStoryModel: 'story-001',
        defaultLogicModel: null,
        useDualModel: false,
      }));

      expect(store.loadAppSettings()).toEqual({
        defaultProviderId: 'openai-compatible',
        defaultCredentialProfileId: 'default',
        defaultStoryModel: 'story-001',
        defaultLogicModel: null,
        useDualModel: false,
        lastPlayerName: null,
      });
    });
  });
```

Add this test to `apps/desktop/src/renderer/stores/config.test.ts`:

```ts
  it('hydrates lastPlayerName from the preload bridge settings payload', async () => {
    const bridge = {
      loadCredentialProfiles: async () => [],
      saveCredentialProfiles: async (_nextProfiles: CredentialProfile[]) => {},
      loadAppSettings: async () => ({
        defaultProviderId: null,
        defaultCredentialProfileId: null,
        defaultStoryModel: null,
        defaultLogicModel: null,
        useDualModel: false,
        lastPlayerName: '林明霜',
      }),
      saveAppSettings: async (_nextSettings: AppSettings) => {},
    };

    const store = createConfigStore(bridge);
    await store.hydrate();

    expect(store.appSettings.lastPlayerName).toBe('林明霜');
  });
```

- [ ] **Step 2: Run the failing settings tests**

Run: `npx vitest run apps/desktop/src/config-store.test.ts apps/desktop/src/renderer/stores/config.test.ts`

Expected: FAIL because `lastPlayerName` is missing from default settings, parser output, and renderer config defaults.

- [ ] **Step 3: Implement the minimal settings changes**

Update `apps/desktop/src/config-store.ts` so `AppSettings` and the parser include `lastPlayerName`:

```ts
type AppSettings = {
  defaultProviderId: string | null;
  defaultCredentialProfileId: string | null;
  defaultStoryModel: string | null;
  defaultLogicModel: string | null;
  useDualModel: boolean;
  lastPlayerName: string | null;
};

function createDefaultAppSettings(): AppSettings {
  return {
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
    lastPlayerName: null,
  };
}

function parseAppSettings(payload: unknown): AppSettings {
  if (!payload || typeof payload !== 'object') {
    return createDefaultAppSettings();
  }

  const record = payload as Record<string, unknown>;

  return {
    defaultProviderId: typeof record.defaultProviderId === 'string' ? record.defaultProviderId : null,
    defaultCredentialProfileId:
      typeof record.defaultCredentialProfileId === 'string' ? record.defaultCredentialProfileId : null,
    defaultStoryModel: typeof record.defaultStoryModel === 'string' ? record.defaultStoryModel : null,
    defaultLogicModel: typeof record.defaultLogicModel === 'string' ? record.defaultLogicModel : null,
    useDualModel: record.useDualModel === true,
    lastPlayerName: typeof record.lastPlayerName === 'string' ? record.lastPlayerName : null,
  };
}
```

Update `apps/desktop/src/renderer/stores/config.ts` so the renderer default settings mirror the same shape:

```ts
function createDefaultSettings(): AppSettings {
  return {
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
    lastPlayerName: null,
  };
}
```

- [ ] **Step 4: Re-run the settings tests**

Run: `npx vitest run apps/desktop/src/config-store.test.ts apps/desktop/src/renderer/stores/config.test.ts`

Expected: PASS with all settings-related tests green.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 2: Extend New-Game Input With `playerProfile`

**Files:**
- Modify: `apps/engine/src/services/session-service.ts`
- Modify: `apps/engine/src/services/session-service.test.ts`
- Modify: `apps/engine/src/routes/session.ts`
- Modify: `apps/engine/src/routes/session.test.ts`
- Modify: `apps/desktop/src/renderer/api/client.test.ts`
- Modify: `apps/desktop/src/renderer/main.test.ts`

- [ ] **Step 1: Write the failing engine/service tests**

Update one `createInitialSession(...)` expectation in `apps/engine/src/services/session-service.test.ts` to pass the new profile input and verify it lands in `stat_data.玩家`:

```ts
  it('creates an initial session with the player profile inside stat_data.玩家', () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
      playerProfile: {
        name: '林明霜',
        gender: '女',
        persona: '普通高中生，外冷内热。',
      },
    });

    expect(session.variableState.stat_data.玩家).toEqual({
      姓名: '林明霜',
      性别: '女',
      人设: '普通高中生，外冷内热。',
    });
  });
```

Update `apps/engine/src/routes/session.test.ts` so the valid `/session/new` payload includes `playerProfile`, and add one invalid-case test:

```ts
        body: {
          providerId: 'openai-compatible',
          credentialProfileId: 'default',
          storyModel: 'story-001',
          logicModel: 'logic-001',
          useDualModel: true,
          playerProfile: {
            name: '林明霜',
            gender: '女',
            persona: '普通高中生，外冷内热。',
          },
        },
```

```ts
  it('returns a 400 response payload when playerProfile is missing from new-session input', async () => {
    const routes = new Map<string, TestHandler>();
    let statusCode = 200;
    let jsonResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const handler = routes.get('/session/new');

    await handler?.(
      {
        body: {
          providerId: 'openai-compatible',
          credentialProfileId: 'default',
          storyModel: 'story-001',
          logicModel: null,
          useDualModel: false,
        },
      },
      {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(value: unknown) {
          jsonResponse = value;
        },
      },
    );

    expect(statusCode).toBe(400);
    expect(jsonResponse).toMatchObject({ error: 'Invalid session/new payload' });
  });
```

Update `apps/desktop/src/renderer/api/client.test.ts` to verify the client sends `playerProfile`:

```ts
  it('posts playerProfile together with the new-session payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createTestSession()),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');

    await client.createNewSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      playerProfile: {
        name: '林明霜',
        gender: '女',
        persona: '普通高中生，外冷内热。',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('http://engine.test/session/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'openai-compatible',
        credentialProfileId: 'default',
        storyModel: 'story-001',
        logicModel: null,
        useDualModel: false,
        playerProfile: {
          name: '林明霜',
          gender: '女',
          persona: '普通高中生，外冷内热。',
        },
      }),
    });
  });
```

Update `apps/desktop/src/renderer/main.test.ts` so its `startNewGame(...)` call includes the same `playerProfile` block.

- [ ] **Step 2: Run the failing engine/client tests**

Run: `npx vitest run apps/engine/src/services/session-service.test.ts apps/engine/src/routes/session.test.ts apps/desktop/src/renderer/api/client.test.ts apps/desktop/src/renderer/main.test.ts`

Expected: FAIL because `playerProfile` is not part of the route schema or `createInitialSession(...)` input yet.

- [ ] **Step 3: Implement the minimal engine payload change**

Update `apps/engine/src/services/session-service.ts` so `CreateInitialSessionInput` includes the profile and the session initializes `stat_data.玩家`:

```ts
type CreateInitialSessionInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
  playerProfile: {
    name: string;
    gender: string;
    persona: string;
  };
};
```

```ts
    variableState: {
      stat_data: {
        世界: {
          当前地点: '教室',
        },
        玩家: {
          姓名: input.playerProfile.name,
          性别: input.playerProfile.gender,
          人设: input.playerProfile.persona,
        },
      },
    },
```

Update `apps/engine/src/routes/session.ts` so `NewSessionInputSchema` includes:

```ts
    playerProfile: z
      .object({
        name: z.string(),
        gender: z.string(),
        persona: z.string(),
      })
      .strict(),
```

No renderer API client implementation change is needed beyond the new typed payload because `createNewSession(payload)` already serializes any provided object.

- [ ] **Step 4: Re-run the engine/client tests**

Run: `npx vitest run apps/engine/src/services/session-service.test.ts apps/engine/src/routes/session.test.ts apps/desktop/src/renderer/api/client.test.ts apps/desktop/src/renderer/main.test.ts`

Expected: PASS with all four files green.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 3: Add A Profile-Aware Session Store Entry Point

**Files:**
- Modify: `apps/desktop/src/renderer/stores/session.ts`
- Modify: `apps/desktop/src/renderer/stores/session.test.ts`

- [ ] **Step 1: Write the failing session store tests**

Add these tests to `apps/desktop/src/renderer/stores/session.test.ts`:

```ts
  it('starts a new game from a submitted player profile and stores the returned player state', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue(
        createTestSession({
          variableState: {
            stat_data: {
              玩家: {
                姓名: '林明霜',
                性别: '女',
                人设: '普通高中生，外冷内热。',
              },
            },
          },
          sceneState: { mode: 'dialog', text: '第一条真实首帧', speaker: '络络' },
        }),
      ),
    });
    const store = createSessionStore(api);

    await store.startNewGameWithProfile({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      playerProfile: {
        name: '林明霜',
        gender: '女',
        persona: '普通高中生，外冷内热。',
      },
    });

    expect(api.createNewSession).toHaveBeenCalledWith({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      playerProfile: {
        name: '林明霜',
        gender: '女',
        persona: '普通高中生，外冷内热。',
      },
    });
    expect(store.currentSession?.variableState.stat_data.玩家).toEqual({
      姓名: '林明霜',
      性别: '女',
      人设: '普通高中生，外冷内热。',
    });
  });

  it('sets bootstrapState to starting while a player-profile start is in flight', async () => {
    let resolveCreate: ((value: unknown) => void) | null = null;
    const api = createApi({
      createNewSession: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      ),
    });
    const store = createSessionStore(api);

    const start = store.startNewGameWithProfile({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      playerProfile: {
        name: '林明霜',
        gender: '',
        persona: '',
      },
    });

    expect(store.bootstrapState).toBe('starting');
    resolveCreate?.(createTestSession());
    await start;
    expect(store.bootstrapState).toBe('idle');
  });
```

- [ ] **Step 2: Run the failing session store tests**

Run: `npx vitest run apps/desktop/src/renderer/stores/session.test.ts`

Expected: FAIL because `startNewGameWithProfile(...)` does not exist yet.

- [ ] **Step 3: Implement the minimal profile-aware store method**

Update `apps/desktop/src/renderer/stores/session.ts` by widening `NewGameInput` and adding one helper method:

```ts
type NewGameInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
  playerProfile: {
    name: string;
    gender: string;
    persona: string;
  };
};
```

```ts
    async startNewGameWithProfile(input: NewGameInput) {
      if (state.currentSession || state.bootstrapState === 'starting') {
        return;
      }

      state.bootstrapState = 'starting';
      state.bootstrapError = null;

      try {
        await state.startNewGame(input);
        state.bootstrapState = 'idle';
      } catch (error) {
        state.bootstrapState = 'error';
        state.bootstrapError = error instanceof Error ? error.message : 'Failed to start a new game.';
      }
    },
```

Leave `startNewGameFromDefaults(...)` in place for now if other tests still reference it, but this flow should no longer be called from `index.ts` after Task 5.

- [ ] **Step 4: Re-run the session store tests**

Run: `npx vitest run apps/desktop/src/renderer/stores/session.test.ts`

Expected: PASS with all session store tests green.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 4: Replace Empty Renderer Startup With A Player Setup Form

**Files:**
- Modify: `apps/desktop/src/renderer/App.ts`
- Modify: `apps/desktop/src/renderer/App.test.ts`

- [ ] **Step 1: Write the failing App tests**

Add these tests to `apps/desktop/src/renderer/App.test.ts`:

```ts
  function mountAppForInteraction(sessionStore: SessionStore) {
    const root = createHostNode('root');
    const renderer = createRenderer<HostNode, HostNode>({
      patchProp(node, key, _prev, next) {
        ;(node as HostNode & { props?: Record<string, unknown> }).props ??= {};
        (node as HostNode & { props: Record<string, unknown> }).props[key] = next;
      },
      insert(child, parent) {
        parent.children.push(child);
      },
      remove() {},
      createElement(type) {
        return createHostNode(type);
      },
      createText(text) {
        return createHostNode('text', text);
      },
      createComment(text) {
        return createHostNode('comment', text);
      },
      setText(node, text) {
        node.text = text;
      },
      setElementText(node, text) {
        node.text = text;
        node.children = [];
      },
      parentNode() {
        return null;
      },
      nextSibling() {
        return null;
      },
      querySelector() {
        return null;
      },
      setScopeId() {},
      cloneNode(node) {
        return createHostNode(node.type, node.text);
      },
      insertStaticContent(content, parent) {
        const node = createHostNode('static', content);
        parent.children.push(node);
        return [node, node];
      },
    });

    renderer.createApp(App, { sessionStore }).mount(root);

    function findLabelControl(node: HostNode, labelText: string): HostNode {
      if (node.type === 'label' && getRenderedText(node).includes(labelText)) {
        return node.children.find((child) => child.type === 'input' || child.type === 'textarea') as HostNode;
      }

      for (const child of node.children) {
        const match = findLabelControl(child, labelText);
        if (match) {
          return match;
        }
      }

      throw new Error(`Unable to find control for label: ${labelText}`);
    }

    function findButton(node: HostNode, labelText: string): HostNode {
      if (node.type === 'button' && getRenderedText(node).includes(labelText)) {
        return node;
      }

      for (const child of node.children) {
        const match = findButton(child, labelText);
        if (match) {
          return match;
        }
      }

      throw new Error(`Unable to find button: ${labelText}`);
    }

    return {
      root,
      fillInput(rootNode: HostNode, labelText: string, value: string) {
        const control = findLabelControl(rootNode, labelText) as HostNode & {
          props?: { onInput?: (event: { target: { value: string } }) => void };
        };
        control.props?.onInput?.({ target: { value } });
      },
      async clickButton(rootNode: HostNode, labelText: string) {
        const button = findButton(rootNode, labelText) as HostNode & {
          props?: { onClick?: () => Promise<void> | void };
        };
        await button.props?.onClick?.();
        await nextTick();
      },
    };
  }

  it('renders a player setup form when there is no current session and bootstrap is idle', () => {
    const onSubmitProfile = vi.fn();
    const output = renderAppWithSessionStore({
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: {
        name: '林明霜',
        gender: '',
        persona: '',
      },
      submitPlayerProfile: onSubmitProfile,
    });

    expect(output).toContain('开始新的游戏');
    expect(output).toContain('林明霜');
    expect(output).toContain('自定义人设');
    expect(output).toContain('开始游戏');
  });

  it('submits the filled player profile from the setup form', async () => {
    const onSubmitProfile = vi.fn();
    const sessionStore = reactive({
      currentSession: null,
      bootstrapState: 'idle' as const,
      bootstrapError: null,
      setupDefaults: {
        name: '林明霜',
        gender: '',
        persona: '',
      },
      submitPlayerProfile: onSubmitProfile,
    });
    const { root, fillInput, clickButton } = mountAppForInteraction(sessionStore);

    fillInput(root, '姓名', '沈秋');
    fillInput(root, '性别', '非二元');
    fillInput(root, '自定义人设', '沉静，观察力强。');
    await clickButton(root, '开始游戏');

    expect(onSubmitProfile).toHaveBeenCalledWith({
      name: '沈秋',
      gender: '非二元',
      persona: '沉静，观察力强。',
    });
  });
```

These tests should live alongside the existing ready / starting / error assertions.

- [ ] **Step 2: Run the failing App tests**

Run: `npx vitest run apps/desktop/src/renderer/App.test.ts`

Expected: FAIL because `App` only renders the empty scene text and has no setup form/callback props.

- [ ] **Step 3: Implement the minimal setup form UI**

Update the `SessionStore` type in `apps/desktop/src/renderer/App.ts` to include:

```ts
type PlayerProfileDraft = {
  name: string;
  gender: string;
  persona: string;
};

export type SessionStore = {
  currentSession: Session | null;
  bootstrapState: 'idle' | 'starting' | 'error';
  bootstrapError: string | null;
  setupDefaults: PlayerProfileDraft;
  submitPlayerProfile: (profile: PlayerProfileDraft) => Promise<void> | void;
};
```

Then make the render path branch like this:

```ts
    if (scene.state === 'empty' && sessionStore.bootstrapState === 'idle') {
      return h(PlayerSetupForm, {
        defaults: sessionStore.setupDefaults,
        onSubmit: sessionStore.submitPlayerProfile,
      });
    }
```

Implement the form inline in `App.ts` as a small `defineComponent(...)` with local `reactive` draft state and three controls:

```ts
const PlayerSetupForm = defineComponent({
  name: 'PlayerSetupForm',
  props: {
    defaults: {
      type: Object as PropType<PlayerProfileDraft>,
      required: true,
    },
    onSubmit: {
      type: Function as PropType<(profile: PlayerProfileDraft) => Promise<void> | void>,
      required: true,
    },
  },
  setup(props) {
    const draft = reactive({
      name: props.defaults.name,
      gender: props.defaults.gender,
      persona: props.defaults.persona,
    });

    async function submit() {
      if (!draft.name.trim()) {
        return;
      }

      await props.onSubmit({
        name: draft.name.trim(),
        gender: draft.gender.trim(),
        persona: draft.persona.trim(),
      });
    }

    return () =>
      h('main', { class: 'app-shell' }, [
        h('div', { class: 'prototype-container' }, [
          h('div', { class: 'bottom-area' }, [
            h('div', { class: 'text-content' }, '开始新的游戏'),
            h('label', ['姓名', h('input', { value: draft.name, onInput: (event) => (draft.name = (event.target as HTMLInputElement).value) })]),
            h('label', ['性别', h('input', { value: draft.gender, onInput: (event) => (draft.gender = (event.target as HTMLInputElement).value) })]),
            h('label', ['自定义人设', h('textarea', { value: draft.persona, onInput: (event) => (draft.persona = (event.target as HTMLTextAreaElement).value) })]),
            h('button', { type: 'button', disabled: !draft.name.trim(), onClick: submit }, '开始游戏'),
          ]),
        ]),
      ]);
  },
});
```

Keep the existing ready scene rendering unchanged for non-empty sessions.

- [ ] **Step 4: Re-run the App tests**

Run: `npx vitest run apps/desktop/src/renderer/App.test.ts`

Expected: PASS with setup form, starting/error, and ready scene tests all green.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 5: Wire Setup Submission Through Renderer Startup

**Files:**
- Modify: `apps/desktop/src/renderer/index.ts`
- Modify: `apps/desktop/src/renderer/index.test.ts`
- Modify: `apps/desktop/src/renderer/main.test.ts`

- [ ] **Step 1: Write the failing startup wiring tests**

Replace the current empty-startup expectations in `apps/desktop/src/renderer/index.test.ts` with these assertions:

```ts
  it('does not auto-start a new game on empty startup', async () => {
    const appRoot = { innerHTML: '' };
    const startNewGameFromDefaults = vi.fn().mockResolvedValue(undefined);
    const sessionStore = {
      currentSession: null,
      bootstrapState: 'idle',
      bootstrapError: null,
      setupDefaults: {
        name: '林明霜',
        gender: '',
        persona: '',
      },
      submitPlayerProfile: vi.fn(),
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
          lastPlayerName: '林明霜',
        },
      },
      sessionStore,
    });
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(appRoot),
    });
    vi.stubGlobal('HTMLElement', Object);

    await import('./index');
    await Promise.resolve();
    await Promise.resolve();

    expect(startNewGameFromDefaults).not.toHaveBeenCalled();
    expect(createApp).toHaveBeenCalledWith('AppStub', { sessionStore });
  });
```

- [ ] **Step 2: Run the failing startup tests**

Run: `npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/main.test.ts`

Expected: FAIL because `index.ts` still calls `startNewGameFromDefaults(...)` on empty startup.

- [ ] **Step 3: Implement the minimal renderer wiring**

Update `apps/desktop/src/renderer/index.ts` so the bootstrap success path becomes:

```ts
void bootstrapElectrobunRenderer({
  Electroview,
})
  .then(async ({ App, sessionStore }) => {
    renderStartupStatus('createApp');
    const app = createApp(App, {
      sessionStore,
    });

    renderStartupStatus('mount');
    app.mount('#app');
  })
```

Do not auto-call `startNewGameFromDefaults(...)` anymore in this file.

- [ ] **Step 4: Re-run the startup tests**

Run: `npx vitest run apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/main.test.ts`

Expected: PASS with the new no-auto-start behavior green.

- [ ] **Step 5: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

### Task 6: Persist The Last Used Name And Submit The Full Profile End-To-End

**Files:**
- Modify: `apps/desktop/src/renderer/bootstrap.ts`
- Modify: `apps/desktop/src/renderer/main.test.ts`
- Modify: `apps/desktop/src/renderer/App.test.ts`
- Modify: `apps/desktop/src/renderer/stores/session.ts`

- [ ] **Step 1: Write the failing integration-style tests**

Add a test to `apps/desktop/src/renderer/main.test.ts` verifying the runtime store callback saves `lastPlayerName` and starts a new game with the full profile:

```ts
  it('saves lastPlayerName and starts a new game from the submitted player profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: null, useDualModel: false },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: {
          stat_data: {
            玩家: { 姓名: '沈秋', 性别: '非二元', 人设: '沉静，观察力强。' },
          },
        },
        timelineState: { nodes: [] },
        logState: { entries: [] },
        sceneState: { mode: 'dialog', text: '第一条真实首帧', speaker: '络络' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    let savedSettings: AppSettings | null = null;
    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles: [] }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({
            settings: {
              defaultProviderId: 'openai-compatible',
              defaultCredentialProfileId: 'default',
              defaultStoryModel: 'story-001',
              defaultLogicModel: null,
              useDualModel: false,
              lastPlayerName: '林明霜',
            },
          }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {
            savedSettings = _payload.settings;
          },
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    await runtime.sessionStore.submitPlayerProfile({
      name: '沈秋',
      gender: '非二元',
      persona: '沉静，观察力强。',
    });

    expect(savedSettings?.lastPlayerName).toBe('沈秋');
    expect(fetchMock).toHaveBeenCalledWith('http://engine.test/session/new', expect.objectContaining({ method: 'POST' }));
    expect(runtime.sessionStore.currentSession?.variableState.stat_data.玩家).toEqual({
      姓名: '沈秋',
      性别: '非二元',
      人设: '沉静，观察力强。',
    });
  });

  it('hydrates setupDefaults.name from lastPlayerName after renderer bootstrap', async () => {
    const runtime = await bootstrapRenderer({
      configRpc: {
        request: {
          loadCredentialProfiles: async () => ({ profiles: [] }),
          saveCredentialProfiles: async (_payload: { profiles: CredentialProfile[] }) => {},
          loadAppSettings: async () => ({
            settings: {
              defaultProviderId: null,
              defaultCredentialProfileId: null,
              defaultStoryModel: null,
              defaultLogicModel: null,
              useDualModel: false,
              lastPlayerName: '林明霜',
            },
          }),
          saveAppSettings: async (_payload: { settings: AppSettings }) => {},
        },
      },
      engineBaseUrl: 'http://engine.test',
    });

    expect(runtime.sessionStore.setupDefaults).toEqual({
      name: '林明霜',
      gender: '',
      persona: '',
    });
  });
```

- [ ] **Step 2: Run the failing integration-style tests**

Run: `npx vitest run apps/desktop/src/renderer/main.test.ts apps/desktop/src/renderer/App.test.ts apps/desktop/src/renderer/stores/session.test.ts`

Expected: FAIL because the runtime bootstrap does not yet connect `submitPlayerProfile(...)` to config persistence plus session start.

- [ ] **Step 3: Implement the bootstrap callback wiring**

Update `apps/desktop/src/renderer/bootstrap.ts` after `await configStore.hydrate();`:

```ts
  sessionStore.setupDefaults = {
    name: configStore.appSettings.lastPlayerName ?? '',
    gender: '',
    persona: '',
  };

  sessionStore.submitPlayerProfile = async (profile) => {
    await configStore.saveAppSettings({
      ...configStore.appSettings,
      lastPlayerName: profile.name,
    });

    sessionStore.setupDefaults = {
      name: profile.name,
      gender: profile.gender,
      persona: profile.persona,
    };

    await sessionStore.startNewGameWithProfile({
      providerId: configStore.appSettings.defaultProviderId ?? 'openai-compatible',
      credentialProfileId: configStore.appSettings.defaultCredentialProfileId ?? 'default',
      storyModel: configStore.appSettings.defaultStoryModel ?? 'story-001',
      logicModel: configStore.appSettings.useDualModel ? configStore.appSettings.defaultLogicModel : null,
      useDualModel: configStore.appSettings.useDualModel,
      playerProfile: profile,
    });
  };
```

And initialize the session store with default no-op values so its shape is stable before hydration:

```ts
    setupDefaults: {
      name: '',
      gender: '',
      persona: '',
    },
    async submitPlayerProfile() {
      throw new Error('Player profile submission is not wired yet.');
    },
```

- [ ] **Step 4: Re-run the integration-style tests**

Run: `npx vitest run apps/desktop/src/renderer/main.test.ts apps/desktop/src/renderer/App.test.ts apps/desktop/src/renderer/stores/session.test.ts`

Expected: PASS with the submit-and-start flow green.

- [ ] **Step 5: Run the focused renderer/engine verification suite**

Run: `npx vitest run apps/desktop/src/config-store.test.ts apps/desktop/src/renderer/stores/config.test.ts apps/engine/src/services/session-service.test.ts apps/engine/src/routes/session.test.ts apps/desktop/src/renderer/api/client.test.ts apps/desktop/src/renderer/stores/session.test.ts apps/desktop/src/renderer/App.test.ts apps/desktop/src/renderer/index.test.ts apps/desktop/src/renderer/main.test.ts`

Expected: PASS with all listed files green.

- [ ] **Step 6: Run full repository verification**

Run: `npm test`

Expected: PASS with all repository tests green and `typecheck:test-contracts` succeeding.

- [ ] **Step 7: Run renderer build verification**

Run: `& "D:\claude-standalone-app\node_modules\electrobun\dist-win-x64\bun.exe" build "src/renderer/index.ts" --outdir ".electrobun-debug\renderer" --target browser`

Expected output includes:

```text
index.js
index.css
bg-classroom-....jpg
char-luoluo-....png
```

- [ ] **Step 8: Run a dev launch smoke test**

Run: `npx electrobun dev`

Expected behavior:

- App launches without renderer crash
- No immediate `Internal server error`
- Empty startup shows the player setup form instead of auto-starting
- Submitting a name starts the first-frame scene and writes `玩家` data into the new session

- [ ] **Step 9: Checkpoint**

Do not create a git commit unless the user explicitly asks for one.

## Spec Coverage Check

- 玩家设定开局页：Task 4, Task 5, Task 6
- `姓名 / 性别 / 自定义人设` 三项：Task 2, Task 4, Task 6
- `stat_data.玩家` 作为真源：Task 2
- `lastPlayerName` 本地预填：Task 1, Task 5, Task 6
- session 拥有玩家身份而非全局设置：Task 2, Task 6
- 不在当前阶段实现 prompt template JSON / interpolation：out of scope by this plan, intentionally deferred
