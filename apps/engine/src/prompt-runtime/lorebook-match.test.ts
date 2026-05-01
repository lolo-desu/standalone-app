import { describe, expect, it } from 'vitest';

import { createInitialSession } from '../services/session-service';
import { matchLorebookEntries } from './lorebook-match';
import type { ContextPreset, LorebookAsset, PromptRuntimeContext } from './types';

const DEFAULT_CONTEXT_PRESET: ContextPreset = {
  kind: 'context',
  name: 'Default',
  storyString: '',
  exampleSeparator: '***',
  chatStart: '***',
  useStopStrings: false,
  namesAsStopStrings: true,
  storyStringPosition: 'before_history',
  storyStringDepth: 1,
  storyStringRole: 'system',
  alwaysForceCharacterName: false,
  trimSentences: false,
  singleLine: false,
};

function createContext(): PromptRuntimeContext {
  const session = createInitialSession({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: 'logic-001',
    useDualModel: true,
  });

  session.variableState.stat_data = {
    玩家: {
      姓名: '阿遥',
      地点: '学校',
    },
  };
  session.sceneState.text = '现在是夜晚，络络站在空教室门口。';

  return {
    session,
    contextPreset: DEFAULT_CONTEXT_PRESET,
    instructPreset: null,
    statData: session.variableState.stat_data,
    playerName: '阿遥',
    characterName: '络络',
    sections: {
      system: '',
      description: '',
      personality: '',
      scenario: '现在是夜晚，地点在学校。',
      persona: '',
      wiBefore: '',
      wiAfter: '',
      anchorBefore: '',
      anchorAfter: '',
    },
    chatHistory: [
      { role: 'user', content: '我们回学校吧。' },
      { role: 'assistant', content: '夜晚的教学楼很安静。' },
    ],
  };
}

describe('matchLorebookEntries', () => {
  it('matches entries from runtime text sources and returns them in stable order', () => {
    const lorebook: LorebookAsset = {
      kind: 'lorebook',
      name: 'Diary Lorebook',
      entries: [
        {
          id: 'school-night',
          text: '夜晚时分，学校会变得格外安静。',
          enabled: true,
          keywords: ['学校', '夜晚'],
          secondaryKeywords: [],
          matchMode: 'all',
          scanDepth: 2,
          insertionPosition: 'before_history',
          order: 10,
          comment: '',
        },
        {
          id: 'luoluo',
          text: '络络会刻意回避空荡的走廊。',
          enabled: true,
          keywords: ['络络'],
          secondaryKeywords: [],
          matchMode: 'any',
          scanDepth: null,
          insertionPosition: 'after_history',
          order: 20,
          comment: '',
        },
      ],
    };

    expect(matchLorebookEntries(createContext(), lorebook).map((entry) => entry.id)).toEqual([
      'school-night',
      'luoluo',
    ]);
  });

  it('dedupes repeated hits and respects scanDepth when reading history', () => {
    const matched = matchLorebookEntries(createContext(), {
      kind: 'lorebook',
      name: 'Diary Lorebook',
      entries: [
        {
          id: 'classroom',
          text: '教室已经熄灯。',
          enabled: true,
          keywords: ['回学校吧'],
          secondaryKeywords: [],
          matchMode: 'any',
          scanDepth: 1,
          insertionPosition: 'before_history',
          order: 5,
          comment: '',
        },
      ],
    });

    expect(matched).toEqual([]);
  });

  it('matches stringified numeric and boolean stat data values', () => {
    const context = createContext();

    context.statData = {
      ...context.statData,
      数值状态: {
        好感度: 3,
        已解锁: true,
      },
    };

    expect(
      matchLorebookEntries(context, {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'numeric-flag',
            text: '数值状态会触发世界书。',
            enabled: true,
            keywords: ['3', 'true'],
            secondaryKeywords: [],
            matchMode: 'all',
            scanDepth: null,
            insertionPosition: 'before_history',
            order: 1,
            comment: '',
          },
        ],
      }).map((entry) => entry.id),
    ).toEqual(['numeric-flag']);
  });

  it('does not treat existing world info sections as lorebook triggers', () => {
    const context = createContext();

    context.sections.wiBefore = '世界书回声';
    context.sections.wiAfter = '世界书尾声';

    expect(
      matchLorebookEntries(context, {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'echo',
            text: '这条不该被已有 world info 反复触发。',
            enabled: true,
            keywords: ['世界书回声'],
            secondaryKeywords: [],
            matchMode: 'any',
            scanDepth: null,
            insertionPosition: 'before_history',
            order: 1,
            comment: '',
          },
        ],
      }),
    ).toEqual([]);
  });
});
