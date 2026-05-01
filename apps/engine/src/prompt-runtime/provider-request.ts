import type { Session } from '@lologames/shared';

import type { AssembledPrompt, NormalizedProviderRequest } from './types';

export function createNormalizedProviderRequest(
  session: Session,
  assembledPrompt: AssembledPrompt,
): NormalizedProviderRequest {
  if (assembledPrompt.mode === 'instruct') {
    return {
      providerId: session.modelConfig.providerId,
      endpoint: 'completions',
      body: {
        model: session.modelConfig.storyModel,
        prompt: assembledPrompt.promptText ?? '',
      },
    };
  }

  return {
    providerId: session.modelConfig.providerId,
    endpoint: 'chat/completions',
    body: {
      model: session.modelConfig.storyModel,
      messages: assembledPrompt.messages,
    },
  };
}
