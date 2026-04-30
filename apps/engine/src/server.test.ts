import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createEngineRequestHandler, handleEngineRequest } from './server';

function createTestSession() {
  return {
    sessionMeta: {
      id: 'sess_server',
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

describe('handleEngineRequest', () => {
  it('persists saved snapshots across separate HTTP requests', async () => {
    const saveResponse = await handleEngineRequest(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          kind: 'quick',
          slotId: null,
        }),
      }),
    );

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toEqual({ id: 'save_quick' });

    const loadResponse = await handleEngineRequest(
      new Request('http://engine.test/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'quick',
          slotId: null,
        }),
      }),
    );

    expect(loadResponse.status).toBe(200);
    await expect(loadResponse.json()).resolves.toMatchObject({
      sessionMeta: {
        id: 'sess_server',
      },
      saveMeta: {
        quickSlotId: 'save_quick',
      },
    });
  });

  it('creates an auto snapshot across separate action and load requests', async () => {
    const actionResponse = await handleEngineRequest(
      new Request('http://engine.test/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          action: {
            kind: 'interact',
            text: '继续推进剧情',
          },
        }),
      }),
    );

    expect(actionResponse.status).toBe(200);
    await expect(actionResponse.json()).resolves.toMatchObject({
      logState: {
        entries: [{ kind: 'interact', speaker: '你', text: '继续推进剧情' }],
      },
      saveMeta: {
        autoSlotId: 'save_auto',
      },
    });

    const loadResponse = await handleEngineRequest(
      new Request('http://engine.test/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'auto',
          slotId: null,
        }),
      }),
    );

    expect(loadResponse.status).toBe(200);
    await expect(loadResponse.json()).resolves.toMatchObject({
      logState: {
        entries: [{ kind: 'interact', speaker: '你', text: '继续推进剧情' }],
      },
      saveMeta: {
        autoSlotId: 'save_auto',
      },
    });
  });

  it('preserves the manual slot index when loading an older snapshot across requests', async () => {
    await handleEngineRequest(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          kind: 'manual',
          slotId: 'slot_1',
        }),
      }),
    );

    await handleEngineRequest(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          kind: 'manual',
          slotId: 'slot_2',
        }),
      }),
    );

    const loadResponse = await handleEngineRequest(
      new Request('http://engine.test/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'manual',
          slotId: 'slot_1',
        }),
      }),
    );

    expect(loadResponse.status).toBe(200);
    await expect(loadResponse.json()).resolves.toMatchObject({
      saveMeta: {
        manualSlotIds: ['slot_1', 'slot_2'],
      },
    });
  });

  it('merges repository-level quick auto and manual availability when loading an older snapshot', async () => {
    const isolatedHandler = createEngineRequestHandler();

    await isolatedHandler(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          kind: 'manual',
          slotId: 'slot_old',
        }),
      }),
    );

    await isolatedHandler(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          kind: 'quick',
          slotId: null,
        }),
      }),
    );

    await isolatedHandler(
      new Request('http://engine.test/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: createTestSession(),
          action: {
            kind: 'move',
            destination: '走廊',
          },
        }),
      }),
    );

    const loadResponse = await isolatedHandler(
      new Request('http://engine.test/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'manual',
          slotId: 'slot_old',
        }),
      }),
    );

    expect(loadResponse.status).toBe(200);
    await expect(loadResponse.json()).resolves.toMatchObject({
      saveMeta: {
        quickSlotId: 'save_quick',
        autoSlotId: 'save_auto',
        manualSlotIds: ['slot_old'],
      },
    });
  });

  it('returns a 400 payload for malformed JSON request bodies', async () => {
    const response = await handleEngineRequest(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON payload' });
  });

  it('returns a 500 payload for unexpected session route failures', async () => {
    const failingHandler = createEngineRequestHandler({
      registerSessionRoutes: async (app) => {
        app.post('/session/save', async () => {
          throw new Error('boom');
        });
      },
    });

    const response = await failingHandler(
      new Request('http://engine.test/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: createTestSession(), kind: 'quick', slotId: null }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });

  it('returns 405 for non-post session endpoint requests', async () => {
    const response = await handleEngineRequest(
      new Request('http://engine.test/session/save', {
        method: 'GET',
      }),
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: 'Method not allowed' });
  });

  it('does not try to parse json for non-post session endpoint requests', async () => {
    const request = {
      method: 'PUT',
      url: 'http://engine.test/session/load',
      json() {
        throw new Error('json should not be called');
      },
    } as unknown as Request;

    const response = await handleEngineRequest(request);

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: 'Method not allowed' });
  });

  it('uses an explicit savesDir across separately created handlers', async () => {
    const savesDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-engine-saves-'));

    try {
      const firstHandler = createEngineRequestHandler({ savesDir } as never);

      const saveResponse = await firstHandler(
        new Request('http://engine.test/session/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: createTestSession(),
            kind: 'quick',
            slotId: null,
          }),
        }),
      );

      expect(saveResponse.status).toBe(200);

      const secondHandler = createEngineRequestHandler({ savesDir } as never);
      const loadResponse = await secondHandler(
        new Request('http://engine.test/session/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'quick',
            slotId: null,
          }),
        }),
      );

      expect(loadResponse.status).toBe(200);
      await expect(loadResponse.json()).resolves.toMatchObject({
        sessionMeta: {
          id: 'sess_server',
        },
        saveMeta: {
          quickSlotId: 'save_quick',
        },
      });
    } finally {
      rmSync(savesDir, { force: true, recursive: true });
    }
  });
});
