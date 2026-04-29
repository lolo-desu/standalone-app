import { defaultScene } from '@standalone/content-riji';
import {
  SessionSchema,
  type InvestigationEntry,
  type LogEntry,
  type SceneState,
  type Session,
  type TimelineNode,
} from '@lologames/shared';

type CreateInitialSessionInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
};

type SessionAction =
  | {
      kind: 'investigate';
      target: string;
    }
  | {
      kind: 'interact';
      text: string;
    }
  | {
      kind: 'move';
      destination: string;
    };

type SaveSnapshotKind = 'quick' | 'auto' | 'manual';

export function createInitialSession(input: CreateInitialSessionInput): Session {
  const now = new Date().toISOString();

  return SessionSchema.parse({
    sessionMeta: {
      id: crypto.randomUUID(),
      workId: 'riji-luoluo',
      createdAt: now,
      updatedAt: now,
    },
    modelConfig: input,
    gameState: {
      playerLocation: '教室',
      luoluoLocation: '教室',
      currentLocation: '教室',
      availableActions: ['interact', 'move', 'investigate'],
    },
    variableState: {
      stat_data: {
        世界: {
          当前地点: '教室',
        },
      },
    },
    timelineState: {
      nodes: [],
    },
    logState: {
      entries: [],
    },
    sceneState: {
      mode: 'dialog',
      text: defaultScene.initialMessage.text,
      speaker: defaultScene.initialMessage.speaker,
    },
    investigationState: {
      entries: [],
    },
    saveMeta: {
      quickSlotId: null,
      autoSlotId: null,
      manualSlotIds: [],
    },
  });
}

function formatActionText(action: SessionAction): string {
  if (action.kind === 'move') {
    return `前往${action.destination}`;
  }

  if (action.kind === 'investigate') {
    return `调查${action.target}`;
  }

  return action.text;
}

function createTimelineNode(action: SessionAction): TimelineNode {
  return {
    id: crypto.randomUUID(),
    kind: action.kind,
    text: formatActionText(action),
    formal: action.kind !== 'investigate',
  };
}

function createInvestigationEntry(target: string): InvestigationEntry {
  return {
    id: crypto.randomUUID(),
    text: `${target} 的环境描述`,
    turnsRemaining: 3,
  };
}

function createLogEntry(action: Extract<SessionAction, { kind: 'interact' | 'move' }>): LogEntry {
  if (action.kind === 'move') {
    return {
      kind: action.kind,
      speaker: '系统',
      text: `你前往${action.destination}。`,
    };
  }

  return {
    kind: action.kind,
    speaker: '你',
    text: action.text,
  };
}

function createGameState(session: Session, action: Extract<SessionAction, { kind: 'interact' | 'move' }>): Session['gameState'] {
  if (action.kind !== 'move') {
    return session.gameState;
  }

  return {
    ...session.gameState,
    playerLocation: action.destination,
    currentLocation: action.destination,
  };
}

function createVariableState(session: Session, action: Extract<SessionAction, { kind: 'interact' | 'move' }>): Session['variableState'] {
  if (action.kind !== 'move') {
    return session.variableState;
  }

  return {
    ...session.variableState,
    stat_data: {
      ...session.variableState.stat_data,
      世界: {
        ...(session.variableState.stat_data.世界 as Record<string, unknown> | undefined),
        当前地点: action.destination,
      },
    },
  };
}

function createSceneState(action: Extract<SessionAction, { kind: 'interact' | 'move' }>): SceneState {
  if (action.kind === 'move') {
    return {
      mode: 'narration',
      text: `你前往${action.destination}。`,
      speaker: null,
    };
  }

  return {
    mode: 'dialog',
    text: action.text,
    speaker: '你',
  };
}

function decayInvestigations(entries: InvestigationEntry[]): InvestigationEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      turnsRemaining: entry.turnsRemaining - 1,
    }))
    .filter((entry) => entry.turnsRemaining > 0);
}

export async function applyAction(session: Session, action: SessionAction): Promise<Session> {
  const updatedAt = new Date().toISOString();

  if (action.kind === 'investigate') {
    return SessionSchema.parse({
      ...session,
      sessionMeta: {
        ...session.sessionMeta,
        updatedAt,
      },
      timelineState: {
        nodes: [...session.timelineState.nodes, createTimelineNode(action)],
      },
      investigationState: {
        entries: [
          ...session.investigationState.entries,
          createInvestigationEntry(action.target),
        ],
      },
    });
  }

  const logEntry = createLogEntry(action);
  const sceneState = createSceneState(action);

  return SessionSchema.parse({
    ...session,
    sessionMeta: {
      ...session.sessionMeta,
      updatedAt,
    },
    timelineState: {
      nodes: [...session.timelineState.nodes, createTimelineNode(action)],
    },
    gameState: createGameState(session, action),
    variableState: createVariableState(session, action),
    logState: {
      entries: [...session.logState.entries, logEntry],
    },
    sceneState,
    investigationState: {
      entries: decayInvestigations(session.investigationState.entries as InvestigationEntry[]),
    },
  });
}

function createSnapshotId(kind: SaveSnapshotKind, slotId: string | null): string {
  if (kind === 'manual') {
    return slotId ?? 'manual';
  }

  return `save_${kind}`;
}

function createSnapshotKey(kind: SaveSnapshotKind, slotId: string | null): string {
  if (kind === 'manual') {
    return `manual:${slotId ?? 'manual'}`;
  }

  return `${kind}:default`;
}

function createSavedSessionSnapshot(
  session: Session,
  kind: SaveSnapshotKind,
  id: string,
  manualSlotIds: string[],
): Session {
  return SessionSchema.parse({
    ...session,
    sessionMeta: {
      ...session.sessionMeta,
      updatedAt: new Date().toISOString(),
    },
    saveMeta: {
      quickSlotId: kind === 'quick' ? id : session.saveMeta.quickSlotId,
      autoSlotId: kind === 'auto' ? id : session.saveMeta.autoSlotId,
      manualSlotIds,
    },
  });
}

export function createSessionSnapshotRepository() {
  const snapshots = new Map<string, Session>();
  const manualSlotIds = new Set<string>();
  let quickSlotId: string | null = null;
  let autoSlotId: string | null = null;

  function listManualSlotIds() {
    return [...manualSlotIds];
  }

  function mergeSaveMeta(session: Session): Session {
    return SessionSchema.parse({
      ...session,
      saveMeta: {
        ...session.saveMeta,
        quickSlotId,
        autoSlotId,
        manualSlotIds: listManualSlotIds(),
      },
    });
  }

  return {
    save(session: Session, kind: SaveSnapshotKind, slotId: string | null) {
      if (kind === 'manual' && slotId) {
        manualSlotIds.add(slotId);
      }

      const id = createSnapshotId(kind, slotId);

      if (kind === 'quick') {
        quickSlotId = id;
      }

      if (kind === 'auto') {
        autoSlotId = id;
      }

      snapshots.set(
        createSnapshotKey(kind, slotId),
        createSavedSessionSnapshot(session, kind, id, listManualSlotIds()),
      );

      return { id };
    },
    load(kind: SaveSnapshotKind, slotId: string | null) {
      const snapshot = snapshots.get(createSnapshotKey(kind, slotId));

      if (!snapshot) {
        return null;
      }

      return mergeSaveMeta(snapshot);
    },
  };
}

export type { CreateInitialSessionInput, SaveSnapshotKind, SessionAction };
