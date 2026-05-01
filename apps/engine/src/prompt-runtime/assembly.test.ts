import { describe, expect, it } from 'vitest';

import { createInitialSession } from '../services/session-service';
import { buildPromptRuntimeContext } from './context';
import { normalizeInstructPreset } from './instruct-preset';
import { assemblePrompt } from './assembly';

function createSessionWithHistory() {
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
      text: '你也早。',
    },
    {
      kind: 'move',
      speaker: '系统',
      text: '你前往走廊。',
    },
  );

  return session;
}

const STORY_STRING = '{{#if persona}}系统提示\n{{persona}}\n{{/if}}{{trim}}';
const RENDERED_STORY_STRING = '系统提示\n姓名：林明霜\n性别：女\n人设：转学生';

describe('assemblePrompt', () => {
  it('renders the story string in chat mode and inserts it before the last storyStringDepth entries', () => {
    const context = buildPromptRuntimeContext(createSessionWithHistory(), {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: STORY_STRING,
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 2,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
    });

    expect(assemblePrompt(context)).toEqual({
      mode: 'chat',
      systemText: RENDERED_STORY_STRING,
      promptText: null,
      messages: [
        {
          role: 'user',
          content: '早上好。',
        },
        {
          role: 'system',
          content: RENDERED_STORY_STRING,
        },
        {
          role: 'assistant',
          content: '你也早。',
        },
        {
          role: 'system',
          content: '你前往走廊。',
        },
      ],
      debug: {
        historyCount: 3,
        usedInstructPreset: false,
      },
    });
  });

  it('renders the story string in chat mode and inserts it after the tail-relative history entry for after_history', () => {
    const context = buildPromptRuntimeContext(createSessionWithHistory(), {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: STORY_STRING,
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'after_history',
        storyStringDepth: 2,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
    });

    expect(assemblePrompt(context)).toEqual({
      mode: 'chat',
      systemText: RENDERED_STORY_STRING,
      promptText: null,
      messages: [
        {
          role: 'user',
          content: '早上好。',
        },
        {
          role: 'assistant',
          content: '你也早。',
        },
        {
          role: 'system',
          content: RENDERED_STORY_STRING,
        },
        {
          role: 'system',
          content: '你前往走廊。',
        },
      ],
      debug: {
        historyCount: 3,
        usedInstructPreset: false,
      },
    });
  });

  it('builds a single instruct prompt string and leaves messages empty', () => {
    const context = buildPromptRuntimeContext(createSessionWithHistory(), {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: STORY_STRING,
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 3,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
    });

    expect(assemblePrompt(context)).toEqual({
      mode: 'instruct',
      systemText: RENDERED_STORY_STRING,
      promptText:
        '[SYS]系统提示\n姓名：林明霜\n性别：女\n人设：转学生[/SYS]\n' +
        '[IN]早上好。[/IN]\n' +
        '[OUT]你也早。[/OUT]\n' +
        '[SYS]你前往走廊。[/SYS]\n',
      messages: [],
      debug: {
        historyCount: 3,
        usedInstructPreset: true,
      },
    });
  });

  it('renders runtime aliases and nested stat data inside the assembled story string', () => {
    const session = createSessionWithHistory();

    session.sceneState.speaker = '林雾';

    const context = buildPromptRuntimeContext(session, {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString:
          '玩家={{playerName}}\n角色={{characterName}}\n姓名={{statData.玩家.姓名}}{{trim}}',
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 2,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
    });

    expect(assemblePrompt(context).systemText).toBe('玩家=林明霜\n角色=林雾\n姓名=林明霜');
  });

  it('throws for unsupported instruct story string placement combinations', () => {
    const context = buildPromptRuntimeContext(createSessionWithHistory(), {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: STORY_STRING,
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'after_history',
        storyStringDepth: 3,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
    });

    expect(() => assemblePrompt(context)).toThrow(
      'Instruct mode only supports storyStringPosition="before_history" with storyStringRole="system".',
    );
  });

  it('throws for unsupported instruct story string role combinations', () => {
    const context = buildPromptRuntimeContext(createSessionWithHistory(), {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: STORY_STRING,
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 3,
        storyStringRole: 'user',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
    });

    expect(() => assemblePrompt(context)).toThrow(
      'Instruct mode only supports storyStringPosition="before_history" with storyStringRole="system".',
    );
  });

  it('does not throw for unsupported instruct story placement when the rendered story string is empty', () => {
    const context = buildPromptRuntimeContext(createSessionWithHistory(), {
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: '',
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'after_history',
        storyStringDepth: 3,
        storyStringRole: 'user',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
    });

    expect(assemblePrompt(context)).toEqual({
      mode: 'instruct',
      systemText: null,
      promptText: '[IN]早上好。[/IN]\n[OUT]你也早。[/OUT]\n[SYS]你前往走廊。[/SYS]\n',
      messages: [],
      debug: {
        historyCount: 3,
        usedInstructPreset: true,
      },
    });
  });

  it('renders matched world info sections inside chat-mode messages', () => {
    const session = createSessionWithHistory();

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

    expect(assemblePrompt(context).messages).toMatchObject([
      {
        role: 'system',
        content: '学校在夜晚会显得更空旷。',
      },
      {
        role: 'user',
        content: '早上好。',
      },
      {
        role: 'assistant',
        content: '你也早。',
      },
      {
        role: 'system',
        content: '你前往走廊。',
      },
      {
        role: 'system',
        content: '络络会放轻脚步。',
      },
    ]);
  });

  it('renders matched world info sections inside instruct prompts', () => {
    const session = createSessionWithHistory();

    session.sceneState.text = '夜晚的学校很安静。';

    const context = buildPromptRuntimeContext(session, {
      lorebook: {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'school',
            text: '学校规则',
            enabled: true,
            keywords: ['学校'],
            secondaryKeywords: [],
            matchMode: 'any',
            scanDepth: null,
            insertionPosition: 'before_history',
            order: 1,
            comment: '',
          },
        ],
      },
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: '{{wiBefore}}{{trim}}',
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 3,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
    });

    expect(assemblePrompt(context).promptText).toContain('学校规则');
  });

  it('inserts wiBefore before history and wiAfter after history in chat mode', () => {
    const session = createSessionWithHistory();

    session.sceneState.text = '夜晚的学校很安静，络络站在走廊上。';

    const context = buildPromptRuntimeContext(session, {
      lorebook: {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'school',
            text: '学校规则',
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
            text: '络络尾声',
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
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: '',
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 2,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
    });

    expect(assemblePrompt(context).messages).toEqual([
      {
        role: 'system',
        content: '学校规则',
      },
      {
        role: 'user',
        content: '早上好。',
      },
      {
        role: 'assistant',
        content: '你也早。',
      },
      {
        role: 'system',
        content: '你前往走廊。',
      },
      {
        role: 'system',
        content: '络络尾声',
      },
    ]);
  });

  it('inserts wiBefore before history and wiAfter after history in instruct mode', () => {
    const session = createSessionWithHistory();

    session.sceneState.text = '夜晚的学校很安静，络络站在走廊上。';

    const context = buildPromptRuntimeContext(session, {
      lorebook: {
        kind: 'lorebook',
        name: 'Diary Lorebook',
        entries: [
          {
            id: 'school',
            text: '学校规则',
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
            text: '络络尾声',
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
      contextPreset: {
        kind: 'context',
        name: 'Default',
        storyString: '',
        exampleSeparator: '***',
        chatStart: '***',
        useStopStrings: false,
        namesAsStopStrings: true,
        storyStringPosition: 'before_history',
        storyStringDepth: 2,
        storyStringRole: 'system',
        alwaysForceCharacterName: false,
        trimSentences: false,
        singleLine: false,
      },
      instructPreset: normalizeInstructPreset({
        name: 'Test Instruct',
        input_sequence: '[IN]',
        output_sequence: '[OUT]',
        last_output_sequence: '',
        system_sequence: '[SYS]',
        stop_sequence: '',
        wrap: true,
        macro: true,
        names_behavior: 'force',
        activation_regex: '',
        first_output_sequence: '',
        skip_examples: false,
        output_suffix: '[/OUT]\n',
        input_suffix: '[/IN]\n',
        system_suffix: '[/SYS]\n',
        user_alignment_message: '',
        system_same_as_user: false,
        last_system_sequence: '',
        first_input_sequence: '',
        last_input_sequence: '',
        sequences_as_stop_strings: false,
        story_string_prefix: '',
        story_string_suffix: '',
      }),
    });

    expect(assemblePrompt(context).promptText).toBe(
      '[SYS]学校规则[/SYS]\n' +
        '[IN]早上好。[/IN]\n' +
        '[OUT]你也早。[/OUT]\n' +
        '[SYS]你前往走廊。[/SYS]\n' +
        '[SYS]络络尾声[/SYS]\n',
    );
  });
});
