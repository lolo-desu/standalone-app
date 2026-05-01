import { reactive } from 'vue';
import { parseSession, type Session } from '@lologames/shared';

import type { AppSettings } from '../../config-store';
import { getDefaultNewGameInput } from '../default-new-game';

type NewGameInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
  playerProfile: {
    name: string;
    gender: string;
    persona: string;
  };
};

interface ApiInterface {
  createNewSession: (payload: NewGameInput) => Promise<unknown>;
  createSaveSnapshot: (session: Session, kind: 'quick' | 'auto' | 'manual', slotId: string | null) => Promise<{ id: string }>;
  loadSaveSnapshot: (kind: 'quick' | 'auto' | 'manual', slotId: string | null) => Promise<unknown>;
}

export function createSessionStore(api: ApiInterface) {
  const state = reactive({
    currentSession: null as Session | null,
    bootstrapState: 'idle' as 'idle' | 'starting' | 'error',
    bootstrapError: null as string | null,
    setupDefaults: {
      name: '',
      gender: '',
      persona: '',
    },
    async submitPlayerProfile() {
      throw new Error('Player profile submission is not wired yet.');
    },
    receiveSession(session: unknown) {
      state.currentSession = parseSession(session);
    },
    async startNewGame(input: NewGameInput) {
      state.receiveSession(await api.createNewSession(input));
    },
    async startNewGameWithProfile(input: NewGameInput) {
      if (state.currentSession || state.bootstrapState === 'starting') {
        return;
      }

      state.bootstrapState = 'starting';
      state.bootstrapError = null;

      try {
        await state.startNewGame(input);
        state.bootstrapState = 'idle';
      } catch (error) {
        state.bootstrapState = 'error';
        state.bootstrapError = error instanceof Error ? error.message : 'Failed to start a new game.';
      }
    },
    async startNewGameFromDefaults(appSettings: AppSettings) {
      if (state.currentSession || state.bootstrapState === 'starting') {
        return;
      }

      const input = getDefaultNewGameInput(appSettings);

      if (!input) {
        return;
      }

      await state.startNewGameWithProfile({
        ...input,
        playerProfile: {
          name: '',
          gender: '',
          persona: '',
        },
      });
    },
    async quickSave() {
      if (!state.currentSession) return;
      const res = await api.createSaveSnapshot(state.currentSession, 'quick', null);
      state.currentSession.saveMeta.quickSlotId = res.id;
    },
    async saveToManualSlot(slotId: string) {
      if (!state.currentSession) return;
      await api.createSaveSnapshot(state.currentSession, 'manual', slotId);
      if (!state.currentSession.saveMeta.manualSlotIds.includes(slotId)) {
        state.currentSession.saveMeta.manualSlotIds.push(slotId);
      }
    },
    async quickLoad() {
      const session = await api.loadSaveSnapshot('quick', null);
      state.receiveSession(session);
    },
    async loadManualSlot(slotId: string) {
      const session = await api.loadSaveSnapshot('manual', slotId);
      state.receiveSession(session);
    },
  });

  return state;
}
