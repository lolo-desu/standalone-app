import { describe, expect, it, vi } from 'vitest';

import { createSessionStore } from './session';

describe('createSessionStore', () => {
  it('creates a new session from story and logic model setup', async () => {
    const api = {
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
    };

    const store = createSessionStore(api as any);

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

  it('preserves formal log and investigation-only state from API sessions', async () => {
    const api = {
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
    };

    const store = createSessionStore(api as any);

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
    const api = {
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
    };

    const store = createSessionStore(api as any);

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
    const api = {
      createNewSession: vi.fn().mockResolvedValue({
        sessionMeta: { id: 'sess_save', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: 'test', useDualModel: false },
        gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
        variableState: { stat_data: {} },
        timelineState: { nodes: [] },
        logState: { entries: [] },
        sceneState: { mode: 'dialog', text: 'saving test', speaker: 'test' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      }),
      createSaveSnapshot: vi.fn().mockImplementation(async (sessionId, kind, slotId) => {
        return { id: slotId ?? `save_${kind}`, sessionId, kind, slotId, createdAt: 'now', stateSnapshot: {} };
      }),
    };

    const store = createSessionStore(api as any);
    await store.startNewGame({ providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: 'test', useDualModel: false });

    const initialSessionId = store.currentSession!.sessionMeta.id;

    // Quick Save
    await store.quickSave();
    expect(api.createSaveSnapshot).toHaveBeenCalledWith(initialSessionId, 'quick', null);
    expect(store.currentSession!.saveMeta.quickSlotId).toBe('save_quick');

    // Manual Save
    await store.saveToManualSlot('slot_1');
    expect(api.createSaveSnapshot).toHaveBeenCalledWith(initialSessionId, 'manual', 'slot_1');
    expect(store.currentSession!.saveMeta.manualSlotIds).toContain('slot_1');

    // Manual Save (another)
    await store.saveToManualSlot('slot_2');
    expect(store.currentSession!.saveMeta.manualSlotIds).toContain('slot_1');
    expect(store.currentSession!.saveMeta.manualSlotIds).toContain('slot_2');
  });

  it('loads sessions from a manual or quick-save snapshot', async () => {
    const api = {
      loadSaveSnapshot: vi.fn().mockResolvedValue({
        sessionMeta: { id: 'sess_loaded', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
        modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: 'test', useDualModel: false },
        gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
        variableState: { stat_data: {} },
        timelineState: { nodes: [] },
        logState: { entries: [{ kind: 'interact', speaker: 'player', text: 'loaded data' }] },
        sceneState: { mode: 'dialog', text: 'loaded test', speaker: 'test' },
        investigationState: { entries: [] },
        saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
      })
    };

    const store = createSessionStore(api as any);
    
    await store.quickLoad();
    expect(api.loadSaveSnapshot).toHaveBeenCalledWith('quick', null);
    expect(store.currentSession!.logState.entries[0].text).toBe('loaded data');

    await store.loadManualSlot('slot_3');
    expect(api.loadSaveSnapshot).toHaveBeenCalledWith('manual', 'slot_3');
  });
});
