import { describe, expect, it } from 'vitest';

import { normalizeInstructPreset } from './instruct-preset';

describe('normalizeInstructPreset', () => {
  it('normalizes a ST-style instruct preset into the internal instruct asset shape', () => {
    const preset = normalizeInstructPreset({
      name: 'Alpaca',
      input_sequence: '### Instruction:',
      output_sequence: '### Response:',
      last_output_sequence: '',
      system_sequence: '### Input:',
      stop_sequence: '',
      wrap: true,
      macro: true,
      names_behavior: 'force',
      activation_regex: '',
      first_output_sequence: '',
      skip_examples: false,
      output_suffix: '\n\n',
      input_suffix: '\n\n',
      system_suffix: '\n\n',
      user_alignment_message: '',
      system_same_as_user: false,
      last_system_sequence: '',
      first_input_sequence: '',
      last_input_sequence: '',
      sequences_as_stop_strings: true,
      story_string_prefix: '',
      story_string_suffix: '\n\n',
    });

    expect(preset).toEqual({
      kind: 'instruct',
      name: 'Alpaca',
      inputSequence: '### Instruction:',
      outputSequence: '### Response:',
      lastOutputSequence: '',
      systemSequence: '### Input:',
      stopSequence: '',
      wrap: true,
      macro: true,
      namesBehavior: 'force',
      activationRegex: '',
      firstOutputSequence: '',
      skipExamples: false,
      outputSuffix: '\n\n',
      inputSuffix: '\n\n',
      systemSuffix: '\n\n',
      userAlignmentMessage: '',
      systemSameAsUser: false,
      lastSystemSequence: '',
      firstInputSequence: '',
      lastInputSequence: '',
      sequencesAsStopStrings: true,
      storyStringPrefix: '',
      storyStringSuffix: '\n\n',
      rawSource: expect.any(Object),
    });
  });
});
