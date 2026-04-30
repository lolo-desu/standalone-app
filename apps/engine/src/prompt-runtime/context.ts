import type { Session } from '@lologames/shared';

import type {
  ContextPreset,
  InstructPreset,
  PromptMessage,
  PromptRuntimeContext,
  PromptSections,
} from './types';

type BuildPromptRuntimeContextOptions = {
  contextPreset?: ContextPreset;
  instructPreset?: InstructPreset | null;
};

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

const DEFAULT_SECTIONS: PromptSections = {
  system: '',
  description: '',
  personality: '',
  scenario: '',
  persona: '',
  wiBefore: '',
  wiAfter: '',
  anchorBefore: '',
  anchorAfter: '',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function buildPersonaSection(statData: Record<string, unknown>): string {
  const player = asRecord(statData.玩家);

  if (!player) {
    return '';
  }

  const lines = [
    ['姓名', asString(player.姓名)],
    ['性别', asString(player.性别)],
    ['人设', asString(player.人设)],
  ]
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}：${value}`);

  return lines.join('\n');
}

function toChatMessage(entry: Session['logState']['entries'][number], playerName: string): PromptMessage {
  if (entry.speaker === '你' || entry.speaker === playerName) {
    return {
      role: 'user',
      content: entry.text,
    };
  }

  if (entry.speaker === null || entry.speaker === '系统') {
    return {
      role: 'system',
      content: entry.text,
    };
  }

  return {
    role: 'assistant',
    content: entry.text,
  };
}

export function buildPromptRuntimeContext(
  session: Session,
  options: BuildPromptRuntimeContextOptions = {},
): PromptRuntimeContext {
  const statData = session.variableState.stat_data;
  const player = asRecord(statData.玩家);
  const playerName = asString(player?.姓名);
  const characterName = session.sceneState.speaker ?? '络络';

  return {
    session,
    contextPreset: options.contextPreset ?? DEFAULT_CONTEXT_PRESET,
    instructPreset: options.instructPreset ?? null,
    statData,
    playerName,
    characterName,
    sections: {
      ...DEFAULT_SECTIONS,
      persona: buildPersonaSection(statData),
    },
    chatHistory: session.logState.entries.map((entry) => toChatMessage(entry, playerName)),
  };
}
