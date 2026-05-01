import type { Session } from '@lologames/shared';
import { describe, expect, it } from 'vitest';

import { createGameSceneViewModel } from './game-scene-view-model';

function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionMeta: { id: 'sess_test', workId: 'riji-luoluo', createdAt: '', updatedAt: '' },
    modelConfig: { providerId: 'test', credentialProfileId: 'test', storyModel: 'test', logicModel: null, useDualModel: false },
    gameState: { playerLocation: 'loc', luoluoLocation: 'loc', currentLocation: 'loc', availableActions: [] },
    variableState: { stat_data: {} },
    timelineState: { nodes: [] },
    logState: { entries: [] },
    sceneState: { mode: 'dialog', speaker: '络络', text: '第一条消息' },
    investigationState: { entries: [] },
    saveMeta: { quickSlotId: null, autoSlotId: null, manualSlotIds: [] },
    ...overrides,
  };
}

describe('createGameSceneViewModel', () => {
  it('returns the empty scene view model when there is no current session', () => {
    expect(createGameSceneViewModel(null)).toEqual({
      state: 'empty',
      dateLabel: '四月十七日 - 放学后',
      speaker: null,
      text: '',
    });
  });

  it('returns the ready scene view model from the current session scene state', () => {
    expect(
      createGameSceneViewModel(
        createTestSession({
          sceneState: { mode: 'dialog', speaker: '络络', text: '放学后一起回家吧。' },
        }),
      ),
    ).toEqual({
      state: 'ready',
      dateLabel: '四月十七日 - 放学后',
      speaker: '络络',
      text: '放学后一起回家吧。',
    });
  });
});
