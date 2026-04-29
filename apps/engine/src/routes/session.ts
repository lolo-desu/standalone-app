import { z } from 'zod';

import { parseSession, type Session } from '@lologames/shared';

import {
  applyAction,
  createInitialSession,
  createSessionSnapshotRepository,
  type SaveSnapshotKind,
  type SessionAction,
} from '../services/session-service';

type AppLike = {
  post: (
    path: string,
    handler: (req: { body: unknown }, res: { json: (value: unknown) => void; status?: (code: number) => { json: (value: unknown) => void } }) => Promise<void>,
  ) => void;
};

const NewSessionInputSchema = z
  .object({
    providerId: z.string(),
    credentialProfileId: z.string(),
    storyModel: z.string(),
    logicModel: z.string().nullable(),
    useDualModel: z.boolean(),
  })
  .strict();

const SessionActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('investigate'), target: z.string() }).strict(),
  z.object({ kind: z.literal('interact'), text: z.string() }).strict(),
  z.object({ kind: z.literal('move'), destination: z.string() }).strict(),
]);

const SaveSnapshotKeySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('quick'), slotId: z.null() }).strict(),
  z.object({ kind: z.literal('auto'), slotId: z.null() }).strict(),
  z.object({ kind: z.literal('manual'), slotId: z.string() }).strict(),
]);

type RegisterSessionRouteDependencies = {
  createInitialSession?: typeof createInitialSession;
  applyAction?: typeof applyAction;
  snapshotRepository?: ReturnType<typeof createSessionSnapshotRepository>;
};

function getInvalidPayloadResponse(path: string) {
  return { error: `Invalid ${path} payload` };
}

export async function registerSessionRoutes(app: AppLike, dependencies: RegisterSessionRouteDependencies = {}) {
  const makeInitialSession = dependencies.createInitialSession ?? createInitialSession;
  const applySessionAction = dependencies.applyAction ?? applyAction;
  const snapshotRepository = dependencies.snapshotRepository ?? createSessionSnapshotRepository();

  app.post('/session/new', async (req, res) => {
    let input: z.infer<typeof NewSessionInputSchema>;

    try {
      input = NewSessionInputSchema.parse(req.body);
    } catch {
      if (res.status) {
        res.status(400).json(getInvalidPayloadResponse('session/new'));
        return;
      }

      throw new Error('Invalid session/new payload');
    }

    res.json(makeInitialSession(input));
  });

  app.post('/session/action', async (req, res) => {
    let body: {
      session: unknown;
      action: SessionAction;
    };
    let session: Session;

    try {
      body = z
        .object({
          session: z.unknown(),
          action: SessionActionSchema,
        })
        .strict()
        .parse(req.body) as {
        session: unknown;
        action: SessionAction;
      };
      session = parseSession(body.session);
    } catch {
      if (res.status) {
        res.status(400).json(getInvalidPayloadResponse('session/action'));
        return;
      }

      throw new Error('Invalid session/action payload');
    }

    const updatedSession = await applySessionAction(session, body.action);

    if (body.action.kind === 'investigate') {
      res.json(updatedSession);
      return;
    }

    snapshotRepository.save(updatedSession, 'auto', null);
    res.json(snapshotRepository.load('auto', null));
  });

  app.post('/session/save', async (req, res) => {
    let body: {
      session: unknown;
      kind: SaveSnapshotKind;
      slotId: string | null;
    };
    let session: Session;
    let saveKey: { kind: SaveSnapshotKind; slotId: string | null };

    try {
      body = z
        .object({
          session: z.unknown(),
          kind: z.enum(['quick', 'auto', 'manual']),
          slotId: z.string().nullable(),
        })
        .strict()
        .parse(req.body) as {
        session: unknown;
        kind: SaveSnapshotKind;
        slotId: string | null;
      };
      session = parseSession(body.session);
      saveKey = SaveSnapshotKeySchema.parse({
        kind: body.kind,
        slotId: body.slotId,
      });
    } catch {
      if (res.status) {
        res.status(400).json(getInvalidPayloadResponse('session/save'));
        return;
      }

      throw new Error('Invalid session/save payload');
    }

    res.json(snapshotRepository.save(session, saveKey.kind, saveKey.slotId));
  });

  app.post('/session/load', async (req, res) => {
    let body: {
      kind: SaveSnapshotKind;
      slotId: string | null;
    };

    try {
      body = SaveSnapshotKeySchema.parse(req.body) as {
        kind: SaveSnapshotKind;
        slotId: string | null;
      };
    } catch {
      if (res.status) {
        res.status(400).json(getInvalidPayloadResponse('session/load'));
        return;
      }

      throw new Error('Invalid session/load payload');
    }

    const session = snapshotRepository.load(body.kind, body.slotId);

    if (!session) {
      if (res.status) {
        res.status(404).json({ error: 'Save snapshot not found' });
        return;
      }

      throw new Error('Save snapshot not found');
    }

    res.json(session);
  });
}
