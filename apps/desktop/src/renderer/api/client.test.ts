import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';

function createTestSession() {
  return {
    sessionMeta: { id: 'sess_client', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: null, useDualModel: false },
    gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', text: 'hello', speaker: 'test' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
  };
}

describe('createApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts full session snapshots when creating a save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'save_quick' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');
    const session = createTestSession();

    await client.createSaveSnapshot(session, 'quick', null);

    expect(fetchMock).toHaveBeenCalledWith('http://engine.test/session/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, kind: 'quick', slotId: null }),
    });
  });

  it('posts snapshot keys when loading a save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createTestSession()),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');

    await client.loadSaveSnapshot('manual', 'slot_1');

    expect(fetchMock).toHaveBeenCalledWith('http://engine.test/session/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'manual', slotId: 'slot_1' }),
    });
  });

  it('throws the server error payload for failed new-session requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Invalid session/new payload' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');

    await expect(
      client.createNewSession({
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
      }),
    ).rejects.toThrow('Invalid session/new payload');
  });

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

  it('throws the server error payload for failed save requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');

    await expect(client.createSaveSnapshot(createTestSession(), 'quick', null)).rejects.toThrow('Internal server error');
  });

  it('rejects malformed successful save responses without a string id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 123 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');

    await expect(client.createSaveSnapshot(createTestSession(), 'quick', null)).rejects.toThrow('Invalid save snapshot response');
  });

  it('falls back to a generic error for failed load requests without a JSON payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('unexpected end of input')),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('http://engine.test');

    await expect(client.loadSaveSnapshot('manual', 'slot_1')).rejects.toThrow('Request failed with status 500');
  });
});
