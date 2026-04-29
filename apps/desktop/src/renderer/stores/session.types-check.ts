import { createSessionStore } from './session';

// @ts-expect-error snapshot methods are required by the store contract
createSessionStore({
  createNewSession: async () => ({
    sessionMeta: { id: 'sess_type', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: null, useDualModel: false },
    gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', text: 'test', speaker: 'test' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
  }),
});
