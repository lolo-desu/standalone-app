import type { Session } from '@lologames/shared';

export type GameSceneViewModel = {
  state: 'empty' | 'ready';
  dateLabel: string;
  speaker: string | null;
  text: string;
};

const DEFAULT_DATE_LABEL = '四月十七日 - 放学后';

export function createGameSceneViewModel(session: Session | null): GameSceneViewModel {
  if (!session) {
    return {
      state: 'empty',
      dateLabel: DEFAULT_DATE_LABEL,
      speaker: null,
      text: '',
    };
  }

  return {
    state: 'ready',
    dateLabel: DEFAULT_DATE_LABEL,
    speaker: session.sceneState.speaker,
    text: session.sceneState.text,
  };
}
