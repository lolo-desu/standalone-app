import { describe, expect, it } from 'vitest';

import { exportContextPreset, normalizeContextPreset } from './context-preset';

describe('normalizeContextPreset', () => {
  it('normalizes a ST-style context preset into the internal context asset shape', () => {
    const preset = normalizeContextPreset({
      name: 'Default',
      story_string: '{{#if system}}{{system}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}',
      example_separator: '***',
      chat_start: '***',
      use_stop_strings: false,
      names_as_stop_strings: true,
      story_string_position: 0,
      story_string_depth: 1,
      story_string_role: 0,
      always_force_name2: true,
      trim_sentences: false,
      single_line: false,
    });

    expect(preset).toEqual({
      kind: 'context',
      name: 'Default',
      storyString: '{{#if system}}{{system}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{trim}}',
      exampleSeparator: '***',
      chatStart: '***',
      useStopStrings: false,
      namesAsStopStrings: true,
      storyStringPosition: 'before_history',
      storyStringDepth: 1,
      storyStringRole: 'system',
      alwaysForceCharacterName: true,
      trimSentences: false,
      singleLine: false,
      rawSource: expect.any(Object),
    });
  });

  it('exports the normalized context preset back into a ST-style JSON object', () => {
    const exported = exportContextPreset({
      kind: 'context',
      name: 'Default',
      storyString: '{{#if system}}{{system}}\n{{/if}}{{trim}}',
      exampleSeparator: '***',
      chatStart: '***',
      useStopStrings: false,
      namesAsStopStrings: true,
      storyStringPosition: 'after_history',
      storyStringDepth: 2,
      storyStringRole: 'user',
      alwaysForceCharacterName: false,
      trimSentences: false,
      singleLine: false,
    });

    expect(exported).toEqual({
      name: 'Default',
      story_string: '{{#if system}}{{system}}\n{{/if}}{{trim}}',
      example_separator: '***',
      chat_start: '***',
      use_stop_strings: false,
      names_as_stop_strings: true,
      story_string_position: 1,
      story_string_depth: 2,
      story_string_role: 1,
      always_force_name2: false,
      trim_sentences: false,
      single_line: false,
    });
  });

  it('maps assistant role values across normalize and export behavior', () => {
    const normalized = normalizeContextPreset({
      name: 'Default',
      story_string: '{{system}}',
      story_string_role: 2,
    });

    expect(normalized.storyStringRole).toBe('assistant');

    expect(
      exportContextPreset({
        ...normalized,
        rawSource: undefined,
      }),
    ).toMatchObject({
      story_string_role: 2,
    });
  });
});
