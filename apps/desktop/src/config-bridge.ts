import type { AppSettings, CredentialProfile } from './config-store';

type Awaitable<T> = Promise<T> | T;

type SyncConfigBridge = {
  loadCredentialProfiles: () => CredentialProfile[];
  saveCredentialProfiles: (profiles: CredentialProfile[]) => void;
  loadAppSettings: () => AppSettings;
  saveAppSettings: (settings: AppSettings) => void;
};

type ConfigBridge = {
  loadCredentialProfiles: () => Awaitable<CredentialProfile[]>;
  saveCredentialProfiles: (profiles: CredentialProfile[]) => Awaitable<void>;
  loadAppSettings: () => Awaitable<AppSettings>;
  saveAppSettings: (settings: AppSettings) => Awaitable<void>;
};

export type { ConfigBridge, SyncConfigBridge };
