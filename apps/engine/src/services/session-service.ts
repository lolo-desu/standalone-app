import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  playerProfile: {
    name: string;
    gender: string;
    persona: string;
  };
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

type SessionSnapshotRepositoryOptions = {
  savesDir?: string;
};

type SnapshotIndex = {
  quickSlotId: string | null;
  autoSlotId: string | null;
  manualSlotIds: string[];
};

let testRepositorySequence = 0;

export function createInitialSession(input: CreateInitialSessionInput): Session {
  const now = new Date().toISOString();
  const { playerProfile, ...modelConfig } = input;

  return SessionSchema.parse({
    sessionMeta: {
      id: crypto.randomUUID(),
      workId: 'riji-luoluo',
      createdAt: now,
      updatedAt: now,
    },
    modelConfig,
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
        玩家: {
          姓名: playerProfile.name,
          性别: playerProfile.gender,
          人设: playerProfile.persona,
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

function createEmptySnapshotIndex(): SnapshotIndex {
  return {
    quickSlotId: null,
    autoSlotId: null,
    manualSlotIds: [],
  };
}

function getDefaultSavesDir() {
  if (process.env.VITEST) {
    testRepositorySequence += 1;
    return path.join(os.tmpdir(), `riji-luoluo-vitest-saves-${process.pid}-${testRepositorySequence}`);
  }

  return process.env.RIJI_LUOLUO_SAVES_DIR ?? path.join(process.env.HOME ?? process.env.USERPROFILE ?? process.cwd(), 'riji-luoluo', 'saves');
}

function getSnapshotIndexPath(savesDir: string) {
  return path.join(savesDir, 'index.json');
}

function getManualSavesDir(savesDir: string) {
  return path.join(savesDir, 'manual');
}

function createManualSnapshotFileName(slotId: string | null) {
  return `${encodeURIComponent(slotId ?? 'manual')}.json`;
}

function tryReadJsonFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function readSnapshotSession(filePath: string) {
  const parsedSnapshot = tryReadJsonFile(filePath);

  if (!parsedSnapshot) {
    return null;
  }

  const snapshotResult = SessionSchema.safeParse(parsedSnapshot);

  if (!snapshotResult.success) {
    return null;
  }

  return snapshotResult.data;
}

function getSnapshotFilePath(savesDir: string, kind: SaveSnapshotKind, slotId: string | null) {
  if (kind === 'quick') {
    return path.join(savesDir, 'quick.json');
  }

  if (kind === 'auto') {
    return path.join(savesDir, 'auto.json');
  }

  return path.join(getManualSavesDir(savesDir), createManualSnapshotFileName(slotId));
}

function ensureSavesDirLayout(savesDir: string) {
  fs.mkdirSync(getManualSavesDir(savesDir), { recursive: true });
}

function listManualSnapshotsFromDisk(savesDir: string) {
  const manualSavesDir = getManualSavesDir(savesDir);

  if (!fs.existsSync(manualSavesDir)) {
    return [];
  }

  return fs
    .readdirSync(manualSavesDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const slotIdFilePath = path.join(manualSavesDir, fileName);
      const session = readSnapshotSession(slotIdFilePath);

      if (!session) {
        return null;
      }

      try {
        return {
          slotId: decodeURIComponent(fileName.slice(0, -'.json'.length)),
          session,
        };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { slotId: string; session: Session } => entry !== null)
    .sort((left, right) => {
      const updatedAtCompare = left.session.sessionMeta.updatedAt.localeCompare(right.session.sessionMeta.updatedAt);

      if (updatedAtCompare !== 0) {
        return updatedAtCompare;
      }

      return left.slotId.localeCompare(right.slotId);
    });
}

function readSnapshotIndex(savesDir: string): SnapshotIndex {
  const indexPath = getSnapshotIndexPath(savesDir);
  const parsed = (fs.existsSync(indexPath) ? tryReadJsonFile(indexPath) : null) as Partial<SnapshotIndex> | null;
  const manualSnapshots = listManualSnapshotsFromDisk(savesDir);
  const manualSlotIdsFromDisk = manualSnapshots.map(({ slotId }) => slotId);
  const indexedManualSlotIds = Array.isArray(parsed?.manualSlotIds)
    ? parsed.manualSlotIds.filter((slotId): slotId is string => typeof slotId === 'string')
    : [];
  const recoveredManualSlotIds = manualSnapshots.reduce<string[]>((bestOrder, { session }) => {
    const candidateOrder = session.saveMeta.manualSlotIds.filter((slotId) => manualSlotIdsFromDisk.includes(slotId));

    if (candidateOrder.length >= bestOrder.length) {
      return candidateOrder;
    }

    return bestOrder;
  }, []);
  const preferredManualSlotIds = indexedManualSlotIds.length > 0 ? indexedManualSlotIds : recoveredManualSlotIds;

  return {
    quickSlotId: readSnapshotSession(getSnapshotFilePath(savesDir, 'quick', null)) ? 'save_quick' : null,
    autoSlotId: readSnapshotSession(getSnapshotFilePath(savesDir, 'auto', null)) ? 'save_auto' : null,
    manualSlotIds: [
      ...preferredManualSlotIds.filter((slotId) => manualSlotIdsFromDisk.includes(slotId)),
      ...manualSlotIdsFromDisk.filter((slotId) => !preferredManualSlotIds.includes(slotId)),
    ],
  };
}

function writeJsonFileAtomically(filePath: string, value: unknown) {
  const tempFilePath = `${filePath}.${process.pid}.tmp`;

  fs.writeFileSync(tempFilePath, JSON.stringify(value, null, 2));
  fs.renameSync(tempFilePath, filePath);
}

function writeSnapshotIndex(savesDir: string, index: SnapshotIndex) {
  writeJsonFileAtomically(getSnapshotIndexPath(savesDir), index);
}

function mergeSaveMeta(session: Session, index: SnapshotIndex): Session {
  return SessionSchema.parse({
    ...session,
    saveMeta: {
      ...session.saveMeta,
      quickSlotId: index.quickSlotId,
      autoSlotId: index.autoSlotId,
      manualSlotIds: index.manualSlotIds,
    },
  });
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

export function createSessionSnapshotRepository(options: SessionSnapshotRepositoryOptions = {}) {
  const savesDir = options.savesDir ?? getDefaultSavesDir();

  ensureSavesDirLayout(savesDir);

  return {
    save(session: Session, kind: SaveSnapshotKind, slotId: string | null) {
      const id = createSnapshotId(kind, slotId);
      const currentIndex = readSnapshotIndex(savesDir);
      const nextIndex: SnapshotIndex = {
        quickSlotId: kind === 'quick' ? id : currentIndex.quickSlotId,
        autoSlotId: kind === 'auto' ? id : currentIndex.autoSlotId,
        manualSlotIds:
          kind === 'manual' && slotId && !currentIndex.manualSlotIds.includes(slotId)
            ? [...currentIndex.manualSlotIds, slotId]
            : currentIndex.manualSlotIds,
      };
      const savedSession = createSavedSessionSnapshot(session, kind, id, nextIndex.manualSlotIds);

      writeJsonFileAtomically(getSnapshotFilePath(savesDir, kind, slotId), savedSession);
      writeSnapshotIndex(savesDir, nextIndex);

      return { id };
    },
    load(kind: SaveSnapshotKind, slotId: string | null) {
      const snapshotFilePath = getSnapshotFilePath(savesDir, kind, slotId);

      if (!fs.existsSync(snapshotFilePath)) {
        return null;
      }

      const index = readSnapshotIndex(savesDir);
      const snapshot = readSnapshotSession(snapshotFilePath);

      if (!snapshot) {
        return null;
      }

      return mergeSaveMeta(snapshot, index);
    },
  };
}

export type { CreateInitialSessionInput, SaveSnapshotKind, SessionAction, SessionSnapshotRepositoryOptions };
