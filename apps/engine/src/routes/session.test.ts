import { describe, expect, it } from 'vitest';

import { registerSessionRoutes } from './session';

type TestRequest = { body: unknown };
type TestResponse = { json: (value: unknown) => void; status: (code: number) => TestResponse };
type TestHandler = (req: TestRequest, res: TestResponse) => Promise<void>;

function createTestSession() {
  return {
    sessionMeta: {
      id: 'sess_route_action',
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
    variableState: {
      stat_data: {},
    },
    timelineState: {
      nodes: [],
    },
    logState: {
      entries: [],
    },
    sceneState: {
      mode: 'dialog',
      text: '第一条消息',
      speaker: '络络',
    },
    investigationState: {
      entries: [],
    },
    saveMeta: {
      quickSlotId: null,
      autoSlotId: null,
      manualSlotIds: [],
    },
  };
}

describe('session routes', () => {
  it('registers POST /session/new', async () => {
    const routes = new Map<string, TestHandler>();
    let jsonResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const handler = routes.get('/session/new');

    expect(handler).toBeTypeOf('function');

    await handler?.(
      {
        body: {
          providerId: 'openai-compatible',
          credentialProfileId: 'default',
          storyModel: 'story-001',
          logicModel: 'logic-001',
          useDualModel: true,
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

    expect(jsonResponse).toMatchObject({
      sessionMeta: { workId: 'riji-luoluo' },
      sceneState: { mode: 'dialog' },
    });
  });

  it('registers POST /session/action', async () => {
    const routes = new Map<string, TestHandler>();
    let jsonResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const handler = routes.get('/session/action');

    expect(handler).toBeTypeOf('function');

    await handler?.(
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

    expect(jsonResponse).toMatchObject({
      logState: { entries: [] },
    });
    expect((jsonResponse as { investigationState: { entries: unknown[] } }).investigationState.entries).toHaveLength(1);
  });

  it('creates or refreshes an auto snapshot after formal session actions', async () => {
    const routes = new Map<string, TestHandler>();
    let actionResponse: unknown;
    let loadResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const actionHandler = routes.get('/session/action');
    const loadHandler = routes.get('/session/load');

    await actionHandler?.(
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

    await loadHandler?.(
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

    expect(actionResponse).toMatchObject({
      gameState: {
        currentLocation: '走廊',
      },
      saveMeta: {
        autoSlotId: 'save_auto',
      },
    });
    expect(loadResponse).toMatchObject({
      gameState: {
        currentLocation: '走廊',
      },
      saveMeta: {
        autoSlotId: 'save_auto',
      },
    });
  });

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

  it('returns a 400 response payload for invalid new-session input', async () => {
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

  it('registers POST /session/save and /session/load for quick snapshots', async () => {
    const routes = new Map<string, TestHandler>();
    let saveResponse: unknown;
    let loadResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const saveHandler = routes.get('/session/save');
    const loadHandler = routes.get('/session/load');

    expect(saveHandler).toBeTypeOf('function');
    expect(loadHandler).toBeTypeOf('function');

    await saveHandler?.(
      {
        body: {
          session: createTestSession(),
          kind: 'quick',
          slotId: null,
        },
      },
      {
        status() {
          return this;
        },
        json(value: unknown) {
          saveResponse = value;
        },
      },
    );

    await loadHandler?.(
      {
        body: {
          kind: 'quick',
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

    expect(saveResponse).toEqual({ id: 'save_quick' });
    expect(loadResponse).toMatchObject({
      sessionMeta: {
        id: 'sess_route_action',
      },
      saveMeta: {
        quickSlotId: 'save_quick',
      },
    });
  });

  it('preserves all manual slot ids when loading an older manual snapshot', async () => {
    const routes = new Map<string, TestHandler>();
    let loadResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const saveHandler = routes.get('/session/save');
    const loadHandler = routes.get('/session/load');

    await saveHandler?.(
      {
        body: {
          session: createTestSession(),
          kind: 'manual',
          slotId: 'slot_1',
        },
      },
      {
        status() {
          return this;
        },
        json() {},
      },
    );

    await saveHandler?.(
      {
        body: {
          session: createTestSession(),
          kind: 'manual',
          slotId: 'slot_2',
        },
      },
      {
        status() {
          return this;
        },
        json() {},
      },
    );

    await loadHandler?.(
      {
        body: {
          kind: 'manual',
          slotId: 'slot_1',
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

    expect(loadResponse).toMatchObject({
      saveMeta: {
        manualSlotIds: ['slot_1', 'slot_2'],
      },
    });
  });

  it('returns a useful failure payload when loading a missing snapshot', async () => {
    const routes = new Map<string, TestHandler>();
    let statusCode = 200;
    let jsonResponse: unknown;

    await registerSessionRoutes({
      post(path: string, handler: TestHandler) {
        routes.set(path, handler);
      },
    });

    const handler = routes.get('/session/load');

    await handler?.(
      {
        body: {
          kind: 'manual',
          slotId: 'slot_missing',
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

    expect(statusCode).toBe(404);
    expect(jsonResponse).toMatchObject({ error: 'Save snapshot not found' });
  });

  it('rethrows unexpected snapshot storage failures instead of returning a 400 payload', async () => {
    const routes = new Map<string, TestHandler>();
    let statusCode = 200;
    let jsonResponse: unknown;

    await registerSessionRoutes(
      {
        post(path: string, handler: TestHandler) {
          routes.set(path, handler);
        },
      },
      {
        snapshotRepository: {
          save() {
            throw new Error('boom');
          },
          load() {
            return null;
          },
        },
      },
    );

    const handler = routes.get('/session/save');

    await expect(
      handler?.(
        {
          body: {
            session: createTestSession(),
            kind: 'quick',
            slotId: null,
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
      ),
    ).rejects.toThrow('boom');

    expect(statusCode).toBe(200);
    expect(jsonResponse).toBeUndefined();
  });
});
