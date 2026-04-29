import type { Session } from '@lologames/shared';

export function getDefaultModelConfig(): Session['modelConfig'] {
  return {
    providerId: 'openai-compatible',
    credentialProfileId: 'default',
    storyModel: 'story-001',
    logicModel: null,
    useDualModel: false,
  };
}
