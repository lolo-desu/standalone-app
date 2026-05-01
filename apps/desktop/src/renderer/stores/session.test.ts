import { nextTick, watch } from 'vue';
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
    });

    expect(api.createNewSession).toHaveBeenCalledOnce();
    expect(store.currentSession?.sceneState.text).toBe('第一条消息');
  });

  it('reacts when startNewGame replaces currentSession for renderer consumers', async () => {
    const api = createApi({
      createNewSession: vi.fn().mockResolvedValue(
        createTestSession({
          sceneState: { mode: 'dialog', text: 'reactive update', speaker: '络络' },
        }),
      ),
    });
    const store = createSessionStore(api);
    const observedTexts: Array<string | null> = [];
    const stop = watch(
      () => store.currentSession?.sceneState.text ?? null,
      (text) => {
        observedTexts.push(text);
      },
      { immediate: true },
    );

    expect(observedTexts).toEqual([null]);

    await store.startNewGame({
      providerId: 'test',
      credentialProfileId: 'test',
      storyModel: 'test',
      logicModel: null,
      useDualModel: false,
    });
    await nextTick();

    expect(observedTexts).toEqual([null, 'reactive update']);

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
    await store.startNewGame({ providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: 'test', useDualModel: false });

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

    await store.startNewGame({ providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: 'test', useDualModel: false });
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
});
