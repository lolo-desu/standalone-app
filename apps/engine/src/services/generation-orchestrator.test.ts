import { describe, expect, it } from 'vitest';

import { normalizeInstructPreset } from '../prompt-runtime/instruct-preset';
import { createInitialSession } from './session-service';
import { orchestrateFormalAction } from './generation-orchestrator';

function createSession() {
  const session = createInitialSession({
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: 'logic-001',
    useDualModel: true,
  });

  session.sceneState.text = '夜晚的学校很安静。';

  return session;
}

describe('orchestrateFormalAction', () => {
  it('builds a lorebook-aware provider request and applies the executor continuation', async () => {
    let seenPromptText = '';
    let seenBody: Record<string, unknown> | null = null;

    const session = await orchestrateFormalAction(
      createSession(),
      { kind: 'interact', text: '学校那边现在很安静。' },
      {
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
        executor: async ({ assembledPrompt, providerRequest }) => {
          seenPromptText = assembledPrompt.promptText ?? '';
          seenBody = providerRequest.body;

          return {
            scene: {
              mode: 'dialog',
              text: '络络轻轻点头。',
              speaker: '络络',
            },
            logEntry: {
              kind: 'dialog',
              speaker: '络络',
              text: '络络轻轻点头。',
            },
          };
        },
      },
    );

    expect(seenPromptText).toContain('学校规则');
    expect(seenBody).toMatchObject({
      model: 'story-001',
      prompt: expect.stringContaining('学校规则'),
    });
    expect(session.sceneState).toEqual({
      mode: 'dialog',
      text: '络络轻轻点头。',
      speaker: '络络',
    });
    expect(session.logState.entries.at(-1)).toEqual({
      kind: 'dialog',
      speaker: '络络',
      text: '络络轻轻点头。',
    });
  });

  it('keeps the default local executor network-free and leaves the formal action session shape intact', async () => {
    const session = await orchestrateFormalAction(createSession(), { kind: 'move', destination: '走廊' });

    expect(session.gameState.currentLocation).toBe('走廊');
    expect(session.sceneState).toEqual({
      mode: 'narration',
      text: '你前往走廊。',
      speaker: null,
    });
    expect(session.logState.entries).toEqual([
      {
        kind: 'move',
        speaker: '系统',
        text: '你前往走廊。',
      },
    ]);
  });
});
