import { parseSession, type Session } from '@lologames/shared';
import { reactive } from 'vue';

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
  const store = reactive({
    currentSession: null as Session | null,
    receiveSession(session: unknown) {
      store.currentSession = parseSession(session);
    },
    async startNewGame(input: NewGameInput) {
      store.receiveSession(await api.createNewSession(input));
    },
    async quickSave() {
      if (!store.currentSession) return;
      const res = await api.createSaveSnapshot(store.currentSession, 'quick', null);
      store.currentSession.saveMeta.quickSlotId = res.id;
    },
    async saveToManualSlot(slotId: string) {
      if (!store.currentSession) return;
      await api.createSaveSnapshot(store.currentSession, 'manual', slotId);
      if (!store.currentSession.saveMeta.manualSlotIds.includes(slotId)) {
        store.currentSession.saveMeta.manualSlotIds.push(slotId);
      }
    },
    async quickLoad() {
      const session = await api.loadSaveSnapshot('quick', null);
      store.receiveSession(session);
    },
    async loadManualSlot(slotId: string) {
      const session = await api.loadSaveSnapshot('manual', slotId);
      store.receiveSession(session);
    }
  });

  return store;
}
