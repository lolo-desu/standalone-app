import { describe, expect, it } from 'vitest';

import { createInitialSession } from '../services/session-service';
import { assemblePrompt } from './assembly';
import { buildPromptRuntimeContext } from './context';
import { normalizeInstructPreset } from './instruct-preset';
import { createNormalizedProviderRequest } from './provider-request';

function createSessionWithHistory() {
  const session = createInitialSession({
    providerId: 'provider-for-test',
    credentialProfileId: 'default',
    storyModel: 'story-model-for-test',
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

describe('createNormalizedProviderRequest', () => {
  it('maps a chat assembled prompt to a chat completions provider request', () => {
    const session = createSessionWithHistory();
    const assembledPrompt = assemblePrompt(
      buildPromptRuntimeContext(session, {
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
      }),
    );

    expect(createNormalizedProviderRequest(session, assembledPrompt)).toEqual({
      providerId: 'provider-for-test',
      endpoint: 'chat/completions',
      body: {
        model: 'story-model-for-test',
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
      },
    });
  });

  it('maps an instruct assembled prompt to a completions provider request', () => {
    const session = createSessionWithHistory();
    const assembledPrompt = assemblePrompt(
      buildPromptRuntimeContext(session, {
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
      }),
    );

    expect(createNormalizedProviderRequest(session, assembledPrompt)).toEqual({
      providerId: 'provider-for-test',
      endpoint: 'completions',
      body: {
        model: 'story-model-for-test',
        prompt:
          '[SYS]系统提示\n姓名：林明霜\n性别：女\n人设：转学生[/SYS]\n' +
          '[IN]早上好。[/IN]\n' +
          '[OUT]你也早。[/OUT]\n' +
          '[SYS]你前往走廊。[/SYS]\n',
      },
    });
  });
});
