import { z } from 'zod';

import type { ContextPreset, StoryStringPosition, StoryStringRole } from './types';

const ContextPresetSchema = z
  .object({
    name: z.string().default('Default'),
    story_string: z.string(),
    example_separator: z.string().default('***'),
    chat_start: z.string().default('***'),
    use_stop_strings: z.boolean().default(false),
    names_as_stop_strings: z.boolean().default(true),
    story_string_position: z.number().int().default(0),
    story_string_depth: z.number().int().nonnegative().default(1),
    story_string_role: z.number().int().default(0),
    always_force_name2: z.boolean().default(false),
    trim_sentences: z.boolean().default(false),
    single_line: z.boolean().default(false),
  })
  .passthrough();

function mapPosition(value: number): StoryStringPosition {
  return value === 1 ? 'after_history' : 'before_history';
}

function mapRole(value: number): StoryStringRole {
  if (value === 1) {
    return 'user';
  }

  if (value === 2) {
    return 'assistant';
  }

  return 'system';
}

export function normalizeContextPreset(input: unknown): ContextPreset {
  const parsed = ContextPresetSchema.parse(input);

  return {
    kind: 'context',
    name: parsed.name,
    storyString: parsed.story_string,
    exampleSeparator: parsed.example_separator,
    chatStart: parsed.chat_start,
    useStopStrings: parsed.use_stop_strings,
    namesAsStopStrings: parsed.names_as_stop_strings,
    storyStringPosition: mapPosition(parsed.story_string_position),
    storyStringDepth: parsed.story_string_depth,
    storyStringRole: mapRole(parsed.story_string_role),
    alwaysForceCharacterName: parsed.always_force_name2,
    trimSentences: parsed.trim_sentences,
    singleLine: parsed.single_line,
    rawSource: input,
  };
}

export function exportContextPreset(preset: ContextPreset) {
  return {
    name: preset.name,
    story_string: preset.storyString,
    example_separator: preset.exampleSeparator,
    chat_start: preset.chatStart,
    use_stop_strings: preset.useStopStrings,
    names_as_stop_strings: preset.namesAsStopStrings,
    story_string_position: preset.storyStringPosition === 'after_history' ? 1 : 0,
    story_string_depth: preset.storyStringDepth,
    story_string_role:
      preset.storyStringRole === 'user' ? 1 : preset.storyStringRole === 'assistant' ? 2 : 0,
    always_force_name2: preset.alwaysForceCharacterName,
    trim_sentences: preset.trimSentences,
    single_line: preset.singleLine,
  };
}
