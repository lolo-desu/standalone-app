import { getFirstMessage } from './first-message';

export const defaultScene = {
  id: 'scene-001',
  name: 'Awakening',
  get initialMessage() {
    return getFirstMessage();
  },
};
