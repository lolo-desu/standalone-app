import type { ConfigBridge } from '../../config-bridge';
import type { AppSettings, CredentialProfile } from '../../config-store';

function createDefaultSettings(): AppSettings {
  return {
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
  };
}

export function createConfigStore(bridge: ConfigBridge) {
  const state = {
    credentialProfiles: [] as CredentialProfile[],
    appSettings: createDefaultSettings(),
    async hydrate() {
      state.credentialProfiles = await bridge.loadCredentialProfiles();
      state.appSettings = await bridge.loadAppSettings();
    },
    async saveCredentialProfiles(profiles: CredentialProfile[]) {
      await bridge.saveCredentialProfiles(profiles);
      state.credentialProfiles = await bridge.loadCredentialProfiles();
    },
    async saveAppSettings(settings: AppSettings) {
      await bridge.saveAppSettings(settings);
      state.appSettings = await bridge.loadAppSettings();
    },
  };

  return state;
}
