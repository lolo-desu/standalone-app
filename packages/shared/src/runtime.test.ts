import { describe, expect, it } from 'vitest';

import { ActionResultSchema, parseActionResult } from './runtime';

describe('ActionResultSchema', () => {
  it('accepts the approved action result shape', () => {
    const result = {
      statePatch: {
        variableState: {
          stat_data: {
            世界: {
              当前地点: '天台',
            },
          },
        },
      },
      scenePatch: {
        mode: 'dialog',
        text: '我们到了天台。',
        speaker: '络络',
      },
      displayPayload: {
        text: '我们到了天台。',
      },
      choices: ['互动', '移动', '调查'],
      logEntry: {
        kind: 'dialog',
        speaker: '络络',
        text: '我们到了天台。',
      },
      autosaveRequired: true,
    };

    expect(ActionResultSchema.parse(result)).toEqual(result);
    expect(parseActionResult(result)).toEqual(result);
  });

  it('accepts arbitrary separated state namespaces inside statePatch', () => {
    const result = ActionResultSchema.safeParse({
      statePatch: {
        variableState: {
          stat_data: {
            世界: {
              当前地点: '天台',
            },
          },
        },
        customState: {
          note: 'temporary',
        },
      },
      scenePatch: {
        mode: 'dialog',
        text: '我们到了天台。',
        speaker: '络络',
      },
      displayPayload: {
        text: '我们到了天台。',
      },
      choices: ['互动', '移动', '调查'],
      logEntry: {
        kind: 'dialog',
        speaker: '络络',
        text: '我们到了天台。',
      },
      autosaveRequired: true,
    });

    expect(result.success).toBe(true);
  });

  it('fills nullable defaults in the approved action result shape', () => {
    const result = ActionResultSchema.safeParse({
      statePatch: {
        variableState: {
          stat_data: {
            世界: {
              当前地点: '天台',
            },
          },
        },
      },
      scenePatch: {
        mode: 'dialog',
        text: '我们到了天台。',
      },
      displayPayload: {
        text: '我们到了天台。',
      },
      choices: ['互动', '移动', '调查'],
      logEntry: {
        kind: 'dialog',
        text: '我们到了天台。',
      },
      autosaveRequired: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.scenePatch.speaker).toBeNull();
    expect(result.data?.logEntry?.speaker).toBeNull();
  });

  it('rejects unknown runtime log kinds and scene modes', () => {
    const result = ActionResultSchema.safeParse({
      statePatch: {
        variableState: {
          stat_data: {
            世界: {
              当前地点: '天台',
            },
          },
        },
      },
      scenePatch: {
        mode: 'unknown-mode',
        text: '我们到了天台。',
        speaker: '络络',
      },
      displayPayload: {
        text: '我们到了天台。',
      },
      choices: ['互动', '移动', '调查'],
      logEntry: {
        kind: 'unknown-kind',
        speaker: '络络',
        text: '我们到了天台。',
      },
      autosaveRequired: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects fields outside the approved action result contract', () => {
    const result = ActionResultSchema.safeParse({
      statePatch: {
        variableState: {
          stat_data: {
            世界: {
              当前地点: '天台',
            },
          },
        },
      },
      scenePatch: {
        mode: 'dialog',
        text: '我们到了天台。',
        speaker: '络络',
      },
      displayPayload: {
        text: '我们到了天台。',
      },
      choices: ['互动', '移动', '调查'],
      logEntry: {
        kind: 'dialog',
        speaker: '络络',
        text: '我们到了天台。',
      },
      autosaveRequired: true,
      debugTrace: ['unexpected'],
    });

    expect(result.success).toBe(false);
  });
});
