import { parseSession, type Session } from '@lologames/shared';

type NewGameInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
};

interface ApiInterface {
  createNewSession: (payload: NewGameInput) => Promise<unknown>;
  createSaveSnapshot: (session: Session, kind: 'quick' | 'auto' | 'manual', slotId: string | null) => Promise<{ id: string }>;
  loadSaveSnapshot: (kind: 'quick' | 'auto' | 'manual', slotId: string | null) => Promise<unknown>;
}

export function createSessionStore(api: ApiInterface) {
  const state = {
    currentSession: null as Session | null,
    receiveSession(session: unknown) {
      state.currentSession = parseSession(session);
    },
    async startNewGame(input: NewGameInput) {
      state.receiveSession(await api.createNewSession(input));
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
    }
  };

  return state;
}
