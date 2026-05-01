import { z } from 'zod';

import type { InstructPreset } from './types';

const InstructPresetSchema = z
  .object({
    name: z.string().default('Default'),
    input_sequence: z.string().default(''),
    output_sequence: z.string().default(''),
    last_output_sequence: z.string().default(''),
    system_sequence: z.string().default(''),
    stop_sequence: z.string().default(''),
    wrap: z.boolean().default(true),
    macro: z.boolean().default(true),
    names_behavior: z.enum(['always', 'never', 'force']).default('force'),
    activation_regex: z.string().default(''),
    first_output_sequence: z.string().default(''),
    skip_examples: z.boolean().default(false),
    output_suffix: z.string().default(''),
    input_suffix: z.string().default(''),
    system_suffix: z.string().default(''),
    user_alignment_message: z.string().default(''),
    system_same_as_user: z.boolean().default(false),
    last_system_sequence: z.string().default(''),
    first_input_sequence: z.string().default(''),
    last_input_sequence: z.string().default(''),
    sequences_as_stop_strings: z.boolean().default(false),
    story_string_prefix: z.string().default(''),
    story_string_suffix: z.string().default(''),
  })
  .passthrough();

export function normalizeInstructPreset(input: unknown): InstructPreset {
  const parsed = InstructPresetSchema.parse(input);

  return {
    kind: 'instruct',
    name: parsed.name,
    inputSequence: parsed.input_sequence,
    outputSequence: parsed.output_sequence,
    lastOutputSequence: parsed.last_output_sequence,
    systemSequence: parsed.system_sequence,
    stopSequence: parsed.stop_sequence,
    wrap: parsed.wrap,
    macro: parsed.macro,
    namesBehavior: parsed.names_behavior,
    activationRegex: parsed.activation_regex,
    firstOutputSequence: parsed.first_output_sequence,
    skipExamples: parsed.skip_examples,
    outputSuffix: parsed.output_suffix,
    inputSuffix: parsed.input_suffix,
    systemSuffix: parsed.system_suffix,
    userAlignmentMessage: parsed.user_alignment_message,
    systemSameAsUser: parsed.system_same_as_user,
    lastSystemSequence: parsed.last_system_sequence,
    firstInputSequence: parsed.first_input_sequence,
    lastInputSequence: parsed.last_input_sequence,
    sequencesAsStopStrings: parsed.sequences_as_stop_strings,
    storyStringPrefix: parsed.story_string_prefix,
    storyStringSuffix: parsed.story_string_suffix,
    rawSource: input,
  };
}
