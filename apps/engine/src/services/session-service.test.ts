import { describe, expect, it } from 'vitest';

import { applyAction, createInitialSession } from './session-service';

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
});
