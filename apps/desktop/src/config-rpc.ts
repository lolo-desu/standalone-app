import type { AppSettings, CredentialProfile } from './config-store';
import type { ConfigBridge, SyncConfigBridge } from './config-bridge';

type ConfigRpcHandlers = {
  loadCredentialProfiles: (_payload: {}) => Promise<{ profiles: CredentialProfile[] }> | { profiles: CredentialProfile[] };
  saveCredentialProfiles: (payload: { profiles: CredentialProfile[] }) => Promise<void> | void;
  loadAppSettings: (_payload: {}) => Promise<{ settings: AppSettings }> | { settings: AppSettings };
  saveAppSettings: (payload: { settings: AppSettings }) => Promise<void> | void;
};

type ConfigRpcClient = {
  request: ConfigRpcHandlers;
};

export function createConfigRpcHandlers(configStore: SyncConfigBridge): ConfigRpcHandlers {
  return {
    loadCredentialProfiles() {
      return { profiles: configStore.loadCredentialProfiles() };
    },
    saveCredentialProfiles(payload) {
      configStore.saveCredentialProfiles(payload.profiles);
    },
    loadAppSettings() {
      return { settings: configStore.loadAppSettings() };
    },
    saveAppSettings(payload) {
      configStore.saveAppSettings(payload.settings);
    },
  };
}

export function createRendererConfigBridge(configRpc: ConfigRpcClient): ConfigBridge {
  return {
    async loadCredentialProfiles() {
      return (await configRpc.request.loadCredentialProfiles({})).profiles;
    },
    async saveCredentialProfiles(profiles: CredentialProfile[]) {
      await configRpc.request.saveCredentialProfiles({ profiles });
    },
    async loadAppSettings() {
      return (await configRpc.request.loadAppSettings({})).settings;
    },
    async saveAppSettings(settings: AppSettings) {
      await configRpc.request.saveAppSettings({ settings });
    },
  };
}

export type { ConfigRpcClient, ConfigRpcHandlers };
