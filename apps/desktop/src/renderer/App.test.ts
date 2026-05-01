import type { Session } from '@lologames/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createGameSceneViewModel } = vi.hoisted(() => ({
  createGameSceneViewModel: vi.fn(),
}));

vi.mock('./game-scene-view-model', () => ({
  createGameSceneViewModel,
}));

import App from './App';

type SceneViewModel = {
  state: 'empty' | 'ready';
  dateLabel: string;
  speaker: string | null;
  text: string;
};

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

function computeScene(sessionStore: { currentSession: Session | null }) {
  return (App.computed as { scene: (this: { sessionStore: { currentSession: Session | null } }) => SceneViewModel }).scene.call({
    sessionStore,
  });
}

describe('App', () => {
  beforeEach(() => {
    createGameSceneViewModel.mockReset();
  });

  it('renders the ready scene from sessionStore.currentSession through the component computed path', () => {
    const session = createTestSession({
      sceneState: { mode: 'dialog', speaker: '络络', text: '放学后一起回家吧。' },
    });
    const expectedScene = {
      state: 'ready',
      dateLabel: '四月十七日 - 放学后',
      speaker: '络络',
      text: '放学后一起回家吧。',
    } satisfies SceneViewModel;
    createGameSceneViewModel.mockReturnValue(expectedScene);

    expect(App.props.sessionStore.required).toBe(true);
    expect(computeScene({ currentSession: session })).toBe(expectedScene);
    expect(createGameSceneViewModel).toHaveBeenCalledWith(session);
    expect(App.template).toContain('{{ scene.dateLabel }}');
    expect(App.template).toContain('v-if="scene.speaker"');
    expect(App.template).toContain('{{ scene.speaker }}');
    expect(App.template).toContain('{{ scene.text }}');
    expect(App.template).not.toContain('v-html');
  });

  it('renders the empty scene without a fallback session store and keeps the speaker conditional', () => {
    const expectedScene = {
      state: 'empty',
      dateLabel: '四月十七日 - 放学后',
      speaker: null,
      text: '当前还没有进行中的游戏。',
    } satisfies SceneViewModel;
    createGameSceneViewModel.mockReturnValue(expectedScene);

    expect(computeScene({ currentSession: null })).toBe(expectedScene);
    expect(createGameSceneViewModel).toHaveBeenCalledWith(null);
    expect(() => {
      (App.computed as { scene: (this: { sessionStore: { currentSession: Session | null } }) => SceneViewModel }).scene.call({} as never);
    }).toThrow();
    expect(App.template).toContain('class="prototype-container"');
    expect(App.template).toContain('class="background-image"');
    expect(App.template).toContain('class="character-portrait"');
    expect(App.template).toContain('class="widget">⏵ AUTO</div>');
  });
});
