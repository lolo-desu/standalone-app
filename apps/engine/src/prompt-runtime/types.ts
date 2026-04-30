import type { Session } from '@lologames/shared';

export type StoryStringRole = 'system' | 'user' | 'assistant';
export type StoryStringPosition = 'before_history' | 'after_history';

export type ContextPreset = {
  kind: 'context';
  name: string;
  storyString: string;
  exampleSeparator: string;
  chatStart: string;
  useStopStrings: boolean;
  namesAsStopStrings: boolean;
  storyStringPosition: StoryStringPosition;
  storyStringDepth: number;
  storyStringRole: StoryStringRole;
  alwaysForceCharacterName: boolean;
  trimSentences: boolean;
  singleLine: boolean;
  rawSource?: unknown;
};

export type InstructPreset = {
  kind: 'instruct';
  name: string;
  inputSequence: string;
  outputSequence: string;
  lastOutputSequence: string;
  systemSequence: string;
  stopSequence: string;
  wrap: boolean;
  macro: boolean;
  namesBehavior: 'always' | 'never' | 'force';
  activationRegex: string;
  firstOutputSequence: string;
  skipExamples: boolean;
  outputSuffix: string;
  inputSuffix: string;
  systemSuffix: string;
  userAlignmentMessage: string;
  systemSameAsUser: boolean;
  lastSystemSequence: string;
  firstInputSequence: string;
  lastInputSequence: string;
  sequencesAsStopStrings: boolean;
  storyStringPrefix: string;
  storyStringSuffix: string;
  rawSource?: unknown;
};

export type PromptMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
};

export type PromptSections = {
  system: string;
  description: string;
  personality: string;
  scenario: string;
  persona: string;
  wiBefore: string;
  wiAfter: string;
  anchorBefore: string;
  anchorAfter: string;
};

export type PromptRuntimeContext = {
  session: Session;
  contextPreset: ContextPreset;
  instructPreset: InstructPreset | null;
  statData: Record<string, unknown>;
  playerName: string;
  characterName: string;
  sections: PromptSections;
  chatHistory: PromptMessage[];
};

export type AssembledPrompt = {
  mode: 'chat' | 'instruct';
  systemText: string | null;
  promptText: string | null;
  messages: PromptMessage[];
  debug: {
    historyCount: number;
    usedInstructPreset: boolean;
  };
};

export type NormalizedProviderRequest = {
  providerId: string;
  endpoint: 'chat/completions' | 'completions';
  body: Record<string, unknown>;
};
