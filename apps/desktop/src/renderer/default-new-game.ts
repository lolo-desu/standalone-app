import type { AppSettings } from '../config-store';

type NewGameInput = {
  providerId: string;
  credentialProfileId: string;
  storyModel: string;
  logicModel: string | null;
  useDualModel: boolean;
};

export function getDefaultNewGameInput(settings: AppSettings): NewGameInput | null {
  if (!settings.defaultProviderId || !settings.defaultCredentialProfileId || !settings.defaultStoryModel) {
    return null;
  }

  if (settings.useDualModel && !settings.defaultLogicModel) {
    return null;
  }

  return {
    providerId: settings.defaultProviderId,
    credentialProfileId: settings.defaultCredentialProfileId,
    storyModel: settings.defaultStoryModel,
    logicModel: settings.useDualModel ? settings.defaultLogicModel : null,
    useDualModel: settings.useDualModel,
  };
}
