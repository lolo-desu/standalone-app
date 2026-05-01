# ST-Compatible Backend Orchestrator Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect formal engine actions to prompt-runtime through a minimal generation orchestrator that builds lorebook-aware prompts, normalizes provider requests, and applies an injected continuation result back onto the session.

**Architecture:** Add a focused `generation-orchestrator` service beside the existing session service. The orchestrator will call `applyAction()` first, then `buildPromptRuntimeContext()`, `assemblePrompt()`, and `createNormalizedProviderRequest()`, and finally hand the assembled data to an injected executor. `/session/action` will keep `investigate` on the current local path and delegate only formal actions to the orchestrator while preserving the existing autosave behavior.

**Tech Stack:** TypeScript, Vitest, Zod

---

## File Structure

- Create: `apps/engine/src/services/generation-orchestrator.ts`
  - Defines orchestrator types, default local executor, and the formal-action orchestration function.
- Create: `apps/engine/src/services/generation-orchestrator.test.ts`
  - Verifies prompt-runtime integration, lorebook propagation, and session patch behavior.
- Modify: `apps/engine/src/routes/session.ts`
  - Wires formal actions through the orchestrator and keeps investigate on the old path.
- Modify: `apps/engine/src/routes/session.test.ts`
  - Verifies route delegation and autosave behavior with injected orchestrator stubs.

### Task 1: Add the generation orchestrator service

**Files:**
- Create: `apps/engine/src/services/generation-orchestrator.ts`
- Create: `apps/engine/src/services/generation-orchestrator.test.ts`

- [ ] **Step 1: Write the failing orchestrator tests**

Create `apps/engine/src/services/generation-orchestrator.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { createInitialSession } from './session-service';
import { orchestrateFormalAction } from './generation-orchestrator';
import { normalizeInstructPreset } from '../prompt-runtime/instruct-preset';

function createSession() {
  const session = createInitialSession({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: 'logic-001',
    useDualModel: true,
  });

  session.sceneState.text = '夜晚的学校很安静。';

  return session;
}

describe('orchestrateFormalAction', () => {
  it('builds a lorebook-aware provider request and applies the executor continuation', async () => {
    let seenPromptText = '';
    let seenBody: Record<string, unknown> | null = null;

    const session = await orchestrateFormalAction(createSession(), { kind: 'interact', text: '你好，络络。' }, {
      lorebook: {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'school',
            text: '学校规则',
            enabled: true,
            keywords: ['学校'],
            secondaryKeywords: [],
            matchMode: 'any',
            scanDepth: null,
            insertionPosition: 'before_history',
            order: 1,
            comment: '',
          },
        ],
      },
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: '{{wiBefore}}{{trim}}',
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 2,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
      executor: async ({ assembledPrompt, providerRequest }) => {
        seenPromptText = assembledPrompt.promptText ?? '';
        seenBody = providerRequest.body;

        return {
          scene: {
            mode: 'dialog',
            text: '络络轻轻点头。',
            speaker: '络络',
          },
          logEntry: {
            kind: 'dialog',
            speaker: '络络',
            text: '络络轻轻点头。',
          },
        };
      },
    });

    expect(seenPromptText).toContain('学校规则');
    expect(seenBody).toMatchObject({
      model: 'story-001',
      prompt: expect.stringContaining('学校规则'),
    });
    expect(session.sceneState).toEqual({
      mode: 'dialog',
      text: '络络轻轻点头。',
      speaker: '络络',
    });
    expect(session.logState.entries.at(-1)).toEqual({
      kind: 'dialog',
      speaker: '络络',
      text: '络络轻轻点头。',
    });
  });

  it('keeps the default local executor network-free and leaves the formal action session shape intact', async () => {
    const session = await orchestrateFormalAction(createSession(), { kind: 'move', destination: '走廊' });

    expect(session.gameState.currentLocation).toBe('走廊');
    expect(session.sceneState).toEqual({
      mode: 'narration',
      text: '你前往走廊。',
      speaker: null,
    });
    expect(session.logState.entries).toEqual([
      {
        kind: 'move',
        speaker: '系统',
        text: '你前往走廊。',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run the orchestrator tests to verify they fail**

Run: `npx vitest run apps/engine/src/services/generation-orchestrator.test.ts`

Expected: FAIL because `generation-orchestrator.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal orchestrator service**

Create `apps/engine/src/services/generation-orchestrator.ts` with:

```ts
import type { LogEntry, SceneState, Session } from '@lologames/shared';

import {
  assemblePrompt,
  buildPromptRuntimeContext,
  createNormalizedProviderRequest,
  type AssembledPrompt,
  type ContextPreset,
  type InstructPreset,
  type LorebookAsset,
  type NormalizedProviderRequest,
} from '../prompt-runtime';
import { applyAction, type SessionAction } from './session-service';

type FormalSessionAction = Extract<SessionAction, { kind: 'interact' | 'move' }>;

export type GeneratedContinuation = {
  scene: SceneState;
  logEntry: LogEntry | null;
};

export type GenerationExecutor = (input: {
  session: Session;
  action: FormalSessionAction;
  assembledPrompt: AssembledPrompt;
  providerRequest: NormalizedProviderRequest;
}) => Promise<GeneratedContinuation>;

type OrchestrateFormalActionOptions = {
  lorebook?: LorebookAsset | null;
  contextPreset?: ContextPreset;
  instructPreset?: InstructPreset | null;
  executor?: GenerationExecutor;
};

async function defaultGenerationExecutor(input: {
  session: Session;
}): Promise<GeneratedContinuation> {
  return {
    scene: input.session.sceneState,
    logEntry: null,
  };
}

export async function orchestrateFormalAction(
  session: Session,
  action: FormalSessionAction,
  options: OrchestrateFormalActionOptions = {},
): Promise<Session> {
  const baseSession = await applyAction(session, action);
  const runtimeContext = buildPromptRuntimeContext(baseSession, {
    lorebook: options.lorebook,
    contextPreset: options.contextPreset,
    instructPreset: options.instructPreset,
  });
  const assembledPrompt = assemblePrompt(runtimeContext);
  const providerRequest = createNormalizedProviderRequest(baseSession, assembledPrompt);
  const continuation = await (options.executor ?? defaultGenerationExecutor)({
    session: baseSession,
    action,
    assembledPrompt,
    providerRequest,
  });

  return {
    ...baseSession,
    sceneState: continuation.scene,
    logState: {
      entries:
        continuation.logEntry === null
          ? baseSession.logState.entries
          : [...baseSession.logState.entries, continuation.logEntry],
    },
  };
}
```

- [ ] **Step 4: Run the orchestrator tests to verify they pass**

Run: `npx vitest run apps/engine/src/services/generation-orchestrator.test.ts`

Expected: PASS with `2 passed`.

### Task 2: Wire formal route actions through the orchestrator

**Files:**
- Modify: `apps/engine/src/routes/session.ts`
- Modify: `apps/engine/src/routes/session.test.ts`

- [ ] **Step 1: Write the failing route delegation tests**

Add to `apps/engine/src/routes/session.test.ts`:

```ts
  it('delegates formal actions to the orchestrator and still refreshes auto saves', async () => {
    const routes = new Map<string, TestHandler>();
    let actionResponse: unknown;
    let loadResponse: unknown;
    let orchestratorCallCount = 0;

    await registerSessionRoutes(
      {
        post(path: string, handler: TestHandler) {
          routes.set(path, handler);
        },
      },
      {
        orchestrateFormalAction: async (session, action) => {
          orchestratorCallCount += 1;

          expect(action).toEqual({ kind: 'move', destination: '走廊' });

          return {
            ...session,
            sceneState: {
              mode: 'dialog',
              text: '络络已经在走廊等你。',
              speaker: '络络',
            },
            saveMeta: session.saveMeta,
          };
        },
      },
    );

    await routes.get('/session/action')?.(
      {
        body: {
          session: createTestSession(),
          action: {
            kind: 'move',
            destination: '走廊',
          },
        },
      },
      {
        status() {
          return this;
        },
        json(value: unknown) {
          actionResponse = value;
        },
      },
    );

    await routes.get('/session/load')?.(
      {
        body: {
          kind: 'auto',
          slotId: null,
        },
      },
      {
        status() {
          return this;
        },
        json(value: unknown) {
          loadResponse = value;
        },
      },
    );

    expect(orchestratorCallCount).toBe(1);
    expect(actionResponse).toMatchObject({
      sceneState: {
        text: '络络已经在走廊等你。',
      },
      saveMeta: {
        autoSlotId: 'save_auto',
      },
    });
    expect(loadResponse).toMatchObject({
      sceneState: {
        text: '络络已经在走廊等你。',
      },
      saveMeta: {
        autoSlotId: 'save_auto',
      },
    });
  });

  it('keeps investigate actions on the existing local path instead of delegating to the orchestrator', async () => {
    const routes = new Map<string, TestHandler>();
    let orchestratorCallCount = 0;
    let jsonResponse: unknown;

    await registerSessionRoutes(
      {
        post(path: string, handler: TestHandler) {
          routes.set(path, handler);
        },
      },
      {
        orchestrateFormalAction: async () => {
          orchestratorCallCount += 1;
          throw new Error('should not be called');
        },
      },
    );

    await routes.get('/session/action')?.(
      {
        body: {
          session: createTestSession(),
          action: {
            kind: 'investigate',
            target: '教室周围',
          },
        },
      },
      {
        status() {
          return this;
        },
        json(value: unknown) {
          jsonResponse = value;
        },
      },
    );

    expect(orchestratorCallCount).toBe(0);
    expect((jsonResponse as { investigationState: { entries: unknown[] } }).investigationState.entries).toHaveLength(1);
  });
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npx vitest run apps/engine/src/routes/session.test.ts`

Expected: FAIL because the route dependency shape does not expose `orchestrateFormalAction` yet.

- [ ] **Step 3: Wire the route to the orchestrator**

Update `apps/engine/src/routes/session.ts` to:

```ts
import { orchestrateFormalAction } from '../services/generation-orchestrator';

type RegisterSessionRouteDependencies = {
  createInitialSession?: typeof createInitialSession;
  applyAction?: typeof applyAction;
  orchestrateFormalAction?: typeof orchestrateFormalAction;
  snapshotRepository?: ReturnType<typeof createSessionSnapshotRepository>;
};

// inside registerSessionRoutes()
const orchestrateSessionAction = dependencies.orchestrateFormalAction ?? orchestrateFormalAction;

// inside POST /session/action
const updatedSession =
  body.action.kind === 'investigate'
    ? await applySessionAction(session, body.action)
    : await orchestrateSessionAction(session, body.action);

if (body.action.kind === 'investigate') {
  res.json(updatedSession);
  return;
}
```

Keep the existing auto-save branch exactly as-is after the updated session is produced.

- [ ] **Step 4: Run the route tests to verify they pass**

Run: `npx vitest run apps/engine/src/routes/session.test.ts`

Expected: PASS with the new route delegation assertions green.

### Task 3: Full verification

**Files:**
- No file changes expected

- [ ] **Step 1: Run the focused orchestrator and route tests**

Run: `npx vitest run apps/engine/src/services/generation-orchestrator.test.ts apps/engine/src/routes/session.test.ts`

Expected: PASS with all orchestrator and route tests green.

- [ ] **Step 2: Run the full repository test suite**

Run: `npm test`

Expected: PASS with all test files green and `typecheck:test-contracts` passing.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`

Expected: only the orchestrator service, related tests, and new docs are changed.

## Self-Review Checklist

- Spec coverage: route boundary, orchestrator service, lorebook-aware prompt runtime integration, and investigate preservation each have explicit tasks.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: `GeneratedContinuation`, `GenerationExecutor`, and `orchestrateFormalAction` are used consistently across tasks.
