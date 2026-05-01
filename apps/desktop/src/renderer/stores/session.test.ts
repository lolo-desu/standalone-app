import { isReactive, nextTick, watchEffect } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { createSessionStore } from './session';

function createTestSession(overrides: Record<string, unknown> = {}) {
  return {
    sessionMeta: { id: 'sess_test', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: 'test', useDualModel: false },
    gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', text: 'test', speaker: 'test' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
    ...overrides,
  };
}

function createTestPlayerProfile(overrides: Partial<{ name: string; gender: string; persona: string }> = {}) {
  return {
    name: '林明霜',
    gender: '女',
    persona: '普通高中生，外冷内热。',
    ...overrides,
  };
}

function createApi(overrides: Record<string, unknown> = {}) {
  return {
    createNewSession: vi.fn().mockResolvedValue(createTestSession()),
    createSaveSnapshot: vi.fn().mockResolvedValue({ id: 'save_quick' }),
    loadSaveSnapshot: vi.fn().mockResolvedValue(createTestSession()),
    ...overrides,
  };
}

describe('createSessionStore', () => {
  it('creates a new session from story and logic model setup', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue({
        sessionMeta: { id: 'sess_1', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: { stat_data: {} },
        timelineState: { nodes: [] },
        logState: { entries: [] },
        sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    });

    const store = createSessionStore(api);

    await store.startNewGame({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
      playerProfile: createTestPlayerProfile(),
    });

    expect(api.createNewSession).toHaveBeenCalledOnce();
    expect(store.currentSession?.sceneState.text).toBe('第一条消息');
  });

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
      playerProfile: {
        name: '',
        gender: '',
        persona: '',
      },
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

  it('does not auto-start again when a session already exists', async () => {
    const api = createApi();
    const store = createSessionStore(api);

    store.receiveSession(createTestSession({
      sceneState: { mode: 'dialog', text: '已有场景', speaker: '络络' },
    }));

    await store.startNewGameFromDefaults({
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: null,
      useDualModel: false,
    });

    expect(api.createNewSession).not.toHaveBeenCalled();
    expect(store.currentSession?.sceneState.text).toBe('已有场景');
  });

  it('does not auto-start again while bootstrap is already in progress', async () => {
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

    const firstStart = store.startNewGameFromDefaults({
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: null,
      useDualModel: false,
    });
    await Promise.resolve();
    await store.startNewGameFromDefaults({
      defaultProviderId: 'openai-compatible',
      defaultCredentialProfileId: 'default',
      defaultStoryModel: 'story-001',
      defaultLogicModel: null,
      useDualModel: false,
    });

    expect(api.createNewSession).toHaveBeenCalledTimes(1);

    resolveCreate?.(createTestSession());
    await firstStart;
  });

  it('exposes reactive currentSession updates for renderer consumers', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue(
        createTestSession({
          sceneState: { mode: 'dialog', text: 'reactive test', speaker: '络络' },
        }),
      ),
    });

    const store = createSessionStore(api);
    let renderedText = 'empty';
    const stop = watchEffect(() => {
      renderedText = store.currentSession?.sceneState.text ?? 'empty';
    });

    expect(isReactive(store)).toBe(true);
    expect(renderedText).toBe('empty');

    await store.startNewGame({
      providerId: 'test',
      credentialProfileId: 'test',
      storyModel: 'test',
      logicModel: null,
      useDualModel: false,
      playerProfile: createTestPlayerProfile(),
    });
    await nextTick();

    expect(renderedText).toBe('reactive test');
    stop();
  });

  it('preserves formal log and investigation-only state from API sessions', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue({
        sessionMeta: { id: 'sess_2', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: { stat_data: {} },
        timelineState: {
          nodes: [
            { id: 'node_1', kind: 'interact', text: '早上好。', formal: true },
            { id: 'node_2', kind: 'investigate', text: '调查黑板', formal: false },
          ],
        },
        logState: {
          entries: [{ kind: 'interact', speaker: '你', text: '早上好。' }],
        },
        sceneState: { mode: 'dialog', text: '早上好。', speaker: '络络' },
        investigationState: {
          entries: [{ id: 'inv_1', text: '黑板上的字迹很新。', turnsRemaining: 2 }],
        },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    });

    const store = createSessionStore(api);

    await store.startNewGame({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
      playerProfile: createTestPlayerProfile(),
    });

    expect(store.currentSession?.logState.entries).toEqual([{ kind: 'interact', speaker: '你', text: '早上好。' }]);
    expect(store.currentSession?.investigationState.entries).toEqual([{ id: 'inv_1', text: '黑板上的字迹很新。', turnsRemaining: 2 }]);
    expect(store.currentSession?.sceneState.text).toBe('早上好。');
  });

  it('rejects malformed API sessions instead of storing broken separated state', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue({
        sessionMeta: { id: 'sess_3', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'openai-compatible', credentialProfileId: 'default', storyModel: 'story-001', logicModel: 'logic-001', useDualModel: true },
        gameState: { playerLocation: '教室', luoluoLocation: '教室', currentLocation: '教室', availableActions: ['interact', 'move', 'investigate'] },
        variableState: { stat_data: {} },
        timelineState: { nodes: [{ kind: 'interact', formal: true }] },
        logState: { entries: [] },
        sceneState: { mode: 'dialog', text: '第一条消息', speaker: '络络' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
    });

    const store = createSessionStore(api);

    await expect(
      store.startNewGame({
        providerId: 'openai-compatible',
        credentialProfileId: 'default',
        storyModel: 'story-001',
        logicModel: 'logic-001',
        useDualModel: true,
        playerProfile: createTestPlayerProfile(),
      }),
    ).rejects.toThrow();
  });

  it('creates manual and quick-save snapshots from the current session', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue(
        createTestSession({
          sessionMeta: { id: 'sess_save', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
          sceneState: { mode: 'dialog', text: 'saving test', speaker: 'test' },
        }),
      ),
      createSaveSnapshot: vi.fn().mockImplementation(async (session, kind, slotId) => {
        return { id: slotId ?? `save_${kind}`, sessionId: session.sessionMeta.id, kind, slotId, createdAt: 'now', stateSnapshot: {} };
      }),
    });

    const store = createSessionStore(api);
    await store.startNewGame({
      providerId: 'test',
      credentialProfileId: 'test',
      storyModel: 'test',
      logicModel: 'test',
      useDualModel: false,
      playerProfile: createTestPlayerProfile(),
    });

    const initialSessionId = store.currentSession!.sessionMeta.id;

    await store.quickSave();
    expect(api.createSaveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ sessionMeta: expect.objectContaining({ id: initialSessionId }) }),
      'quick',
      null,
    );
    expect(store.currentSession!.saveMeta.quickSlotId).toBe('save_quick');

    await store.saveToManualSlot('slot_1');
    expect(api.createSaveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ sessionMeta: expect.objectContaining({ id: initialSessionId }) }),
      'manual',
      'slot_1',
    );
    expect(store.currentSession!.saveMeta.manualSlotIds).toContain('slot_1');

    await store.saveToManualSlot('slot_2');
    expect(store.currentSession!.saveMeta.manualSlotIds).toContain('slot_1');
    expect(store.currentSession!.saveMeta.manualSlotIds).toContain('slot_2');
  });

  it('saves and reloads sessions through the API-backed snapshot methods', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue(
        createTestSession({
          sessionMeta: { id: 'sess_before_save', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
          sceneState: { mode: 'dialog', text: 'before save', speaker: 'test' },
        }),
      ),
      createSaveSnapshot: vi.fn().mockResolvedValue({ id: 'save_quick' }),
      loadSaveSnapshot: vi.fn().mockResolvedValue(
        createTestSession({
          sessionMeta: { id: 'sess_loaded', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
          logState: { entries: [{ kind: 'interact', speaker: 'player', text: 'loaded data' }] },
          sceneState: { mode: 'dialog', text: 'loaded test', speaker: 'test' },
          saveMeta: { quickSlotId: 'save_quick', autoSlotId: null, manualSlotIds: ['slot_3'] },
        }),
      ),
    });

    const store = createSessionStore(api);

    await store.startNewGame({
      providerId: 'test',
      credentialProfileId: 'test',
      storyModel: 'test',
      logicModel: 'test',
      useDualModel: false,
      playerProfile: createTestPlayerProfile(),
    });
    await store.quickSave();
    await store.quickLoad();

    expect(api.createSaveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ sessionMeta: expect.objectContaining({ id: 'sess_before_save' }) }),
      'quick',
      null,
    );
    expect(api.loadSaveSnapshot).toHaveBeenCalledWith('quick', null);
    expect(store.currentSession!.logState.entries[0].text).toBe('loaded data');
    expect(store.currentSession!.saveMeta.quickSlotId).toBe('save_quick');

    await store.loadManualSlot('slot_3');
    expect(api.loadSaveSnapshot).toHaveBeenCalledWith('manual', 'slot_3');
    expect(store.currentSession!.saveMeta.manualSlotIds).toEqual(['slot_3']);
  });

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
      playerProfile: createTestPlayerProfile(),
    });

    expect(api.createNewSession).toHaveBeenCalledWith({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
      playerProfile: createTestPlayerProfile(),
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
      playerProfile: createTestPlayerProfile({ gender: '', persona: '' }),
    });

    expect(store.bootstrapState).toBe('starting');
    resolveCreate?.(createTestSession());
    await start;
    expect(store.bootstrapState).toBe('idle');
  });
});
