import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyAction, createInitialSession, createSessionSnapshotRepository } from './session-service';

function createRepositoryTestSession() {
  return createInitialSession({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: 'logic-001',
    useDualModel: true,
  });
}

async function withTempSavesDir(run: (savesDir: string) => void | Promise<void>) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-saves-'));

  try {
    await run(tempDir);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

describe('session-service', () => {
  it('creates an initial session from new-game input', () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    expect(session.sessionMeta.workId).toBe('riji-luoluo');
    expect(session.sceneState.mode).toBe('dialog');
    expect(session.sceneState.speaker).toBe('络络');
    expect(session.sceneState.text).toBe('打……打扰了。那个，可以找一下……<user>同学吗？');
  });

  it('keeps investigate actions out of the formal log', async () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    const next = await applyAction(session, { kind: 'investigate', target: '教室周围' });

    expect(next.logState.entries).toHaveLength(0);
    expect(next.investigationState.entries).toHaveLength(1);
  });

  it('writes interact actions to timeline and log but keeps scene current-only', async () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    const next = await applyAction(session, { kind: 'interact', text: '【看向络络】早上好。' });

    expect(next.timelineState.nodes).toHaveLength(1);
    expect(next.logState.entries).toHaveLength(1);
    expect(next.sceneState.text).toContain('早上好');
  });

  it('expires investigation context after three formal turns', async () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    const afterInvestigate = await applyAction(session, { kind: 'investigate', target: '黑板' });
    const afterFirstInteract = await applyAction(afterInvestigate, { kind: 'interact', text: '1' });
    const afterSecondInteract = await applyAction(afterFirstInteract, { kind: 'interact', text: '2' });
    const afterMove = await applyAction(afterSecondInteract, { kind: 'move', destination: '走廊' });

    expect(afterMove.investigationState.entries).toHaveLength(0);
  });

  it('updates location state when move actions resolve', async () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    const next = await applyAction(session, { kind: 'move', destination: '走廊' });

    expect(next.gameState.playerLocation).toBe('走廊');
    expect(next.gameState.currentLocation).toBe('走廊');
    expect(next.variableState.stat_data.世界.当前地点).toBe('走廊');
  });

  it('allows single-model sessions with a null logic model', () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: null,
      useDualModel: false,
    });

    expect(session.modelConfig.logicModel).toBeNull();
    expect(session.modelConfig.useDualModel).toBe(false);
  });

  it('persists quick manual and auto snapshots across repository instances', async () => {
    await withTempSavesDir(async (savesDir) => {
      const firstRepository = createSessionSnapshotRepository({ savesDir });
      const quickSession = createRepositoryTestSession();
      const manualSession = createRepositoryTestSession();
      const autoSession = await applyAction(createRepositoryTestSession(), { kind: 'move', destination: '走廊' });

      firstRepository.save(quickSession, 'quick', null);
      firstRepository.save(manualSession, 'manual', 'slot_1');
      firstRepository.save(autoSession, 'auto', null);

      const secondRepository = createSessionSnapshotRepository({ savesDir });

      expect(secondRepository.load('quick', null)).toMatchObject({
        sessionMeta: { id: quickSession.sessionMeta.id },
        saveMeta: {
          quickSlotId: 'save_quick',
          autoSlotId: 'save_auto',
          manualSlotIds: ['slot_1'],
        },
      });
      expect(secondRepository.load('manual', 'slot_1')).toMatchObject({
        sessionMeta: { id: manualSession.sessionMeta.id },
        saveMeta: {
          quickSlotId: 'save_quick',
          autoSlotId: 'save_auto',
          manualSlotIds: ['slot_1'],
        },
      });
      expect(secondRepository.load('auto', null)).toMatchObject({
        gameState: { currentLocation: '走廊' },
        saveMeta: {
          quickSlotId: 'save_quick',
          autoSlotId: 'save_auto',
          manualSlotIds: ['slot_1'],
        },
      });
    });
  });

  it('returns null when a disk-backed snapshot is missing', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });

      expect(repository.load('manual', 'missing_slot')).toBeNull();
    });
  });

  it('keeps repository-level saveMeta when loading an older manual disk snapshot', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });

      repository.save(createRepositoryTestSession(), 'manual', 'slot_old');
      repository.save(createRepositoryTestSession(), 'manual', 'slot_new');
      repository.save(createRepositoryTestSession(), 'quick', null);
      repository.save(createRepositoryTestSession(), 'auto', null);

      expect(repository.load('manual', 'slot_old')).toMatchObject({
        saveMeta: {
          quickSlotId: 'save_quick',
          autoSlotId: 'save_auto',
          manualSlotIds: ['slot_old', 'slot_new'],
        },
      });
    });
  });

  it('stores manual slot ids without letting them overwrite other snapshot files', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });
      const quickSession = createRepositoryTestSession();
      const manualSession = createRepositoryTestSession();

      repository.save(quickSession, 'quick', null);
      repository.save(manualSession, 'manual', '../quick');

      expect(repository.load('quick', null)).toMatchObject({
        sessionMeta: {
          id: quickSession.sessionMeta.id,
        },
      });
      expect(repository.load('manual', '../quick')).toMatchObject({
        sessionMeta: {
          id: manualSession.sessionMeta.id,
        },
        saveMeta: {
          manualSlotIds: ['../quick'],
        },
      });
    });
  });

  it('rebuilds save availability from disk when index.json is corrupted', () => {
    return withTempSavesDir((savesDir) => {
      const firstRepository = createSessionSnapshotRepository({ savesDir });
      const quickSession = createRepositoryTestSession();

      firstRepository.save(quickSession, 'quick', null);
      firstRepository.save(createRepositoryTestSession(), 'manual', 'slot_1');
      firstRepository.save(createRepositoryTestSession(), 'auto', null);

      writeFileSync(path.join(savesDir, 'index.json'), '{');

      const secondRepository = createSessionSnapshotRepository({ savesDir });

      expect(secondRepository.load('quick', null)).toMatchObject({
        sessionMeta: {
          id: quickSession.sessionMeta.id,
        },
        saveMeta: {
          quickSlotId: 'save_quick',
          autoSlotId: 'save_auto',
          manualSlotIds: ['slot_1'],
        },
      });

      expect(() => secondRepository.save(createRepositoryTestSession(), 'manual', 'slot_2')).not.toThrow();
      expect(secondRepository.load('manual', 'slot_2')).toMatchObject({
        saveMeta: {
          manualSlotIds: ['slot_1', 'slot_2'],
        },
      });
    });
  });

  it('treats a corrupted snapshot file as missing instead of throwing', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });

      repository.save(createRepositoryTestSession(), 'quick', null);
      writeFileSync(path.join(savesDir, 'quick.json'), '{');

      expect(repository.load('quick', null)).toBeNull();
    });
  });

  it('does not advertise corrupted snapshots in recovered saveMeta', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });

      repository.save(createRepositoryTestSession(), 'quick', null);
      repository.save(createRepositoryTestSession(), 'manual', 'slot_1');

      writeFileSync(path.join(savesDir, 'quick.json'), '{');
      writeFileSync(path.join(savesDir, 'index.json'), '{');

      const recoveredRepository = createSessionSnapshotRepository({ savesDir });

      expect(recoveredRepository.load('manual', 'slot_1')).toMatchObject({
        saveMeta: {
          quickSlotId: null,
          manualSlotIds: ['slot_1'],
        },
      });
    });
  });

  it('defaults to the desktop app saves directory instead of the launch cwd', () => {
    const tempHomeDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-home-'));
    const tempCwdDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-cwd-'));
    const previousHome = process.env.HOME;
    const previousUserProfile = process.env.USERPROFILE;
    const previousVitest = process.env.VITEST;
    const previousCwd = process.cwd();

    try {
      process.env.HOME = tempHomeDir;
      delete process.env.USERPROFILE;
      delete process.env.VITEST;
      process.chdir(tempCwdDir);

      const repository = createSessionSnapshotRepository();

      repository.save(createRepositoryTestSession(), 'quick', null);

      expect(existsSync(path.join(tempHomeDir, 'riji-luoluo', 'saves', 'quick.json'))).toBe(true);
    } finally {
      process.chdir(previousCwd);

      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }

      if (previousUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = previousUserProfile;
      }

      if (previousVitest === undefined) {
        delete process.env.VITEST;
      } else {
        process.env.VITEST = previousVitest;
      }

      rmSync(tempHomeDir, { force: true, recursive: true });
      rmSync(tempCwdDir, { force: true, recursive: true });
    }
  });

  it('falls back to USERPROFILE when HOME is unavailable', () => {
    const tempProfileDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-profile-'));
    const tempCwdDir = mkdtempSync(path.join(os.tmpdir(), 'riji-luoluo-cwd-'));
    const previousHome = process.env.HOME;
    const previousUserProfile = process.env.USERPROFILE;
    const previousVitest = process.env.VITEST;
    const previousCwd = process.cwd();

    try {
      delete process.env.HOME;
      process.env.USERPROFILE = tempProfileDir;
      delete process.env.VITEST;
      process.chdir(tempCwdDir);

      const repository = createSessionSnapshotRepository();

      repository.save(createRepositoryTestSession(), 'quick', null);

      expect(existsSync(path.join(tempProfileDir, 'riji-luoluo', 'saves', 'quick.json'))).toBe(true);
    } finally {
      process.chdir(previousCwd);

      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }

      if (previousUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = previousUserProfile;
      }

      if (previousVitest === undefined) {
        delete process.env.VITEST;
      } else {
        process.env.VITEST = previousVitest;
      }

      rmSync(tempProfileDir, { force: true, recursive: true });
      rmSync(tempCwdDir, { force: true, recursive: true });
    }
  });

  it('rebuilds manual slot order from saved snapshot metadata when index.json is corrupted', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });

      repository.save(createRepositoryTestSession(), 'manual', 'slot_b');
      repository.save(createRepositoryTestSession(), 'manual', 'slot_a');

      writeFileSync(path.join(savesDir, 'index.json'), '{');

      const recoveredRepository = createSessionSnapshotRepository({ savesDir });

      expect(recoveredRepository.load('manual', 'slot_b')).toMatchObject({
        saveMeta: {
          manualSlotIds: ['slot_b', 'slot_a'],
        },
      });
    });
  });

  it('recovers newer manual snapshots when index.json is stale but still valid', () => {
    return withTempSavesDir((savesDir) => {
      const repository = createSessionSnapshotRepository({ savesDir });

      repository.save(createRepositoryTestSession(), 'manual', 'slot_old');
      repository.save(createRepositoryTestSession(), 'manual', 'slot_new');

      writeFileSync(
        path.join(savesDir, 'index.json'),
        JSON.stringify({
          quickSlotId: null,
          autoSlotId: null,
          manualSlotIds: ['slot_old'],
        }),
      );

      const recoveredRepository = createSessionSnapshotRepository({ savesDir });

      expect(recoveredRepository.load('manual', 'slot_new')).toMatchObject({
        saveMeta: {
          manualSlotIds: ['slot_old', 'slot_new'],
        },
      });
    });
  });
});
