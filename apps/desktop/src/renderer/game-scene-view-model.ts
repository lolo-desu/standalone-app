import type { Session } from '@lologames/shared';

export type GameSceneViewModel = {
  state: 'empty' | 'ready';
  dateLabel: string;
  speaker: string | null;
  text: string;
};

const DATE_LABEL = '四月十七日 - 放学后';

export function createGameSceneViewModel(session: Session | null): GameSceneViewModel {
  if (!session) {
    return {
      state: 'empty',
      dateLabel: DATE_LABEL,
      speaker: null,
      text: '当前还没有进行中的游戏。',
    };
  }

  return {
    state: 'ready',
    dateLabel: DATE_LABEL,
    speaker: session.sceneState.speaker,
    text: session.sceneState.text,
  };
}
