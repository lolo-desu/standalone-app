import { renderStoryString } from './story-string';
import type { AssembledPrompt, PromptMessage, PromptRuntimeContext } from './types';

function getStoryInsertionIndex(history: PromptMessage[], depth: number): number {
  return Math.max(0, history.length - depth);
}

function buildStoryRenderData(context: PromptRuntimeContext): Record<string, unknown> {
  return {
    ...context.sections,
    playerName: context.playerName,
    characterName: context.characterName,
    statData: context.statData,
  };
}

function renderSystemText(context: PromptRuntimeContext): string | null {
  const systemText = renderStoryString(context.contextPreset.storyString, buildStoryRenderData(context));

  return systemText.length > 0 ? systemText : null;
}

function withStoryMessage(
  history: PromptMessage[],
  systemText: string | null,
  context: PromptRuntimeContext,
): PromptMessage[] {
  if (systemText === null) {
    return history;
  }

  const storyMessage: PromptMessage = {
    role: context.contextPreset.storyStringRole,
    content: systemText,
  };

  const insertionIndex = getStoryInsertionIndex(history, context.contextPreset.storyStringDepth);

  return context.contextPreset.storyStringPosition === 'after_history'
    ? [
        ...history.slice(0, Math.min(history.length, insertionIndex + 1)),
        storyMessage,
        ...history.slice(Math.min(history.length, insertionIndex + 1)),
      ]
    : [...history.slice(0, insertionIndex), storyMessage, ...history.slice(insertionIndex)];
}

function assertSupportedInstructStoryPlacement(context: PromptRuntimeContext): void {
  if (
    context.contextPreset.storyStringPosition !== 'before_history' ||
    context.contextPreset.storyStringRole !== 'system'
  ) {
    throw new Error(
      'Instruct mode only supports storyStringPosition="before_history" with storyStringRole="system".',
    );
  }
}

function formatInstructMessage(message: PromptMessage, context: PromptRuntimeContext): string {
  const preset = context.instructPreset;

  if (preset === null) {
    return '';
  }

  if (message.role === 'assistant') {
    return `${preset.outputSequence}${message.content}${preset.outputSuffix}`;
  }

  if (message.role === 'user') {
    return `${preset.inputSequence}${message.content}${preset.inputSuffix}`;
  }

  return `${preset.systemSequence}${message.content}${preset.systemSuffix}`;
}

export function assemblePrompt(context: PromptRuntimeContext): AssembledPrompt {
  const systemText = renderSystemText(context);
  const historyWithStory = withStoryMessage(context.chatHistory, systemText, context);

  if (context.instructPreset !== null) {
    if (systemText !== null) {
      assertSupportedInstructStoryPlacement(context);
    }
    const preset = context.instructPreset;
    const insertionIndex = getStoryInsertionIndex(context.chatHistory, context.contextPreset.storyStringDepth);
    const promptText = `${context.chatHistory
      .slice(0, insertionIndex)
      .map((message) => formatInstructMessage(message, context))
      .join('')}${
      systemText === null
        ? ''
        : `${preset.storyStringPrefix}${preset.systemSequence}${systemText}${preset.systemSuffix}${preset.storyStringSuffix}`
    }${context.chatHistory
      .slice(insertionIndex)
      .map((message) => formatInstructMessage(message, context))
      .join('')}`;

    return {
      mode: 'instruct',
      systemText,
      promptText,
      messages: [],
      debug: {
        historyCount: context.chatHistory.length,
        usedInstructPreset: true,
      },
    };
  }

  return {
    mode: 'chat',
    systemText,
    promptText: null,
    messages: historyWithStory,
    debug: {
      historyCount: context.chatHistory.length,
      usedInstructPreset: false,
    },
  };
}
