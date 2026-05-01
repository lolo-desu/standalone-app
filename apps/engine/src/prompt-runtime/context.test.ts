import { describe, expect, it } from 'vitest';

import { createInitialSession } from '../services/session-service';
import { buildPromptRuntimeContext } from './context';

describe('buildPromptRuntimeContext', () => {
  it('derives persona data and chat history from the session', () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    session.variableState.stat_data = {
      ...session.variableState.stat_data,
      玩家: {
        姓名: '林明霜',
        性别: '女',
        人设: '转学生',
      },
    };
    session.logState.entries.push(
      {
        kind: 'interact',
        speaker: '你',
        text: '早上好。',
      },
      {
        kind: 'interact',
        speaker: '络络',
        text: '早、早上好。',
      },
    );

    const context = buildPromptRuntimeContext(session);

    expect(context.playerName).toBe('林明霜');
    expect(context.characterName).toBe('络络');
    expect(context.sections).toMatchObject({
      system: '',
      description: '',
      personality: '',
      scenario: '',
      wiBefore: '',
      wiAfter: '',
      anchorBefore: '',
      anchorAfter: '',
    });
    expect(context.sections.persona).toContain('姓名：林明霜');
    expect(context.sections.persona).toContain('性别：女');
    expect(context.sections.persona).toContain('人设：转学生');
    expect(context.chatHistory).toEqual([
      {
        role: 'user',
        content: '早上好。',
      },
      {
        role: 'assistant',
        content: '早、早上好。',
      },
    ]);
  });

  it('populates wiBefore and wiAfter from matched lorebook entries', () => {
    const session = createInitialSession({
      providerId: 'openai-compatible',
      credentialProfileId: 'default',
      storyModel: 'story-001',
      logicModel: 'logic-001',
      useDualModel: true,
    });

    session.sceneState.text = '夜晚的学校很安静，络络站在走廊上。';

    const context = buildPromptRuntimeContext(session, {
      lorebook: {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'school',
            text: '学校在夜晚会显得更空旷。',
            enabled: true,
            keywords: ['学校'],
            secondaryKeywords: [],
            matchMode: 'any',
            scanDepth: null,
            insertionPosition: 'before_history',
            order: 1,
            comment: '',
          },
          {
            id: 'luoluo',
            text: '络络会放轻脚步。',
            enabled: true,
            keywords: ['络络'],
            secondaryKeywords: [],
            matchMode: 'any',
            scanDepth: null,
            insertionPosition: 'after_history',
            order: 2,
            comment: '',
          },
        ],
      },
    });

    expect(context.sections.wiBefore).toBe('学校在夜晚会显得更空旷。');
    expect(context.sections.wiAfter).toBe('络络会放轻脚步。');
  });
});
