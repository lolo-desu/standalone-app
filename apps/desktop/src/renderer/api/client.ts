import type { Session } from '@lologames/shared';

type ApiResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

async function parseApiResponse(response: ApiResponseLike) {
  if (response.ok) {
    return response.json();
  }

  const payload = await response.json().catch(() => null);

  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    throw new Error(payload.error);
  }

  throw new Error(`Request failed with status ${response.status}`);
}

function parseSaveSnapshotResponse(payload: unknown): { id: string } {
  if (
    payload &&
    typeof payload === 'object' &&
    'id' in payload &&
    typeof payload.id === 'string'
  ) {
    return { id: payload.id };
  }

  throw new Error('Invalid save snapshot response');
}

export function createApiClient(baseUrl = 'http://127.0.0.1:43111') {
  return {
    async createNewSession(payload: Record<string, unknown>) {
      const response = await fetch(`${baseUrl}/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return parseApiResponse(response);
    },
    async createSaveSnapshot(session: Session, kind: 'quick' | 'auto' | 'manual', slotId: string | null) {
      const response = await fetch(`${baseUrl}/session/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, kind, slotId }),
      });

      return parseSaveSnapshotResponse(await parseApiResponse(response));
    },
    async loadSaveSnapshot(kind: 'quick' | 'auto' | 'manual', slotId: string | null) {
      const response = await fetch(`${baseUrl}/session/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, slotId }),
      });

      return parseApiResponse(response);
    },
  };
}
