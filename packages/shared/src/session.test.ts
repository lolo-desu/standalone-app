import { describe, expect, it } from 'vitest';

import { SessionSchema, parseSession } from './session';

describe('SessionSchema', () => {
  it('accepts the approved standalone session snapshot shape', () => {
    const snapshot = {
      sessionMeta: {
        id: 'sess_1',
        workId: 'riji-luoluo',
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
      },
      modelConfig: {
        providerId: 'openai-compatible',
        credentialProfileId: 'default',
        storyModel: 'story-001',
        logicModel: 'logic-001',
        useDualModel: true,
      },
      gameState: {
        playerLocation: '教室',
        luoluoLocation: '教室',
        currentLocation: '教室',
        availableActions: ['interact', 'move', 'investigate'],
      },
      variableState: {
        stat_data: {
          世界: {
            当前时间: '08:00',
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
        text: '第一条消息',
        speaker: '络络',
      },
      investigationState: {
        entries: [],
      },
      saveMeta: {
        quickSlotId: null,
        autoSlotId: null,
        manualSlotIds: [],
      },
    };

    expect(SessionSchema.parse(snapshot)).toEqual(snapshot);
    expect(parseSession(snapshot)).toEqual(snapshot);
  });

  it('rejects drift outside the approved top-level session contract', () => {
    const result = SessionSchema.safeParse({
      sessionMeta: {
        id: 'sess_1',
        workId: 'riji-luoluo',
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
      },
      modelConfig: {
        providerId: 'openai-compatible',
        credentialProfileId: 'default',
        storyModel: 'story-001',
        logicModel: 'logic-001',
        useDualModel: true,
      },
      gameState: {
        playerLocation: '教室',
        luoluoLocation: '教室',
        currentLocation: '教室',
        availableActions: ['interact', 'move', 'investigate'],
      },
      variableState: {
        stat_data: {
          世界: {
            当前时间: '08:00',
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
        text: '第一条消息',
        speaker: '络络',
      },
      investigationState: {
        entries: [],
      },
      saveMeta: {
        quickSlotId: null,
        autoSlotId: null,
        manualSlotIds: [],
      },
      legacyTimeline: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects malformed separated runtime slices inside the session', () => {
    const result = SessionSchema.safeParse({
      sessionMeta: {
        id: 'sess_1',
        workId: 'riji-luoluo',
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
      },
      modelConfig: {
        providerId: 'openai-compatible',
        credentialProfileId: 'default',
        storyModel: 'story-001',
        logicModel: 'logic-001',
        useDualModel: true,
      },
      gameState: {
        playerLocation: '教室',
        luoluoLocation: '教室',
        currentLocation: '教室',
        availableActions: ['interact', 'move', 'investigate'],
      },
      variableState: {
        stat_data: {
          世界: {
            当前时间: '08:00',
          },
        },
      },
      timelineState: {
        nodes: [{ kind: 'interact', formal: true }],
      },
      logState: {
        entries: [],
      },
      sceneState: {
        mode: 'dialog',
        text: '第一条消息',
        speaker: '络络',
      },
      investigationState: {
        entries: [{ id: 'inv_1', text: '线索' }],
      },
      saveMeta: {
        quickSlotId: null,
        autoSlotId: null,
        manualSlotIds: [],
      },
    });

    expect(result.success).toBe(false);
  });
});
