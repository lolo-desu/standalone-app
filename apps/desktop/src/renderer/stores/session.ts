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
  createSaveSnapshot?: (sessionId: string, kind: 'quick' | 'auto' | 'manual', slotId: string | null) => Promise<{ id: string }>;
  loadSaveSnapshot?: (kind: 'quick' | 'auto' | 'manual', slotId: string | null) => Promise<unknown>;
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
      if (!api.createSaveSnapshot) throw new Error('Not implemented');
      const res = await api.createSaveSnapshot(state.currentSession.sessionMeta.id, 'quick', null);
      state.currentSession.saveMeta.quickSlotId = res.id;
    },
    async saveToManualSlot(slotId: string) {
      if (!state.currentSession) return;
      if (!api.createSaveSnapshot) throw new Error('Not implemented');
      const res = await api.createSaveSnapshot(state.currentSession.sessionMeta.id, 'manual', slotId);
      if (!state.currentSession.saveMeta.manualSlotIds.includes(slotId)) {
        state.currentSession.saveMeta.manualSlotIds.push(slotId);
      }
    },
    async quickLoad() {
      if (!api.loadSaveSnapshot) throw new Error('Not implemented');
      const session = await api.loadSaveSnapshot('quick', null);
      state.receiveSession(session);
    },
    async loadManualSlot(slotId: string) {
      if (!api.loadSaveSnapshot) throw new Error('Not implemented');
      const session = await api.loadSaveSnapshot('manual', slotId);
      state.receiveSession(session);
    }
  };

  return state;
}
