import type { ConfigRpcClient } from '../config-rpc';
import { createRendererConfigBridge } from '../config-rpc';
import { createApiClient } from './api/client';
import { getDefaultNewGameInput } from './default-new-game';
import { createConfigStore } from './stores/config';
import { createSessionStore } from './stores/session';

type RendererBootstrapDependencies = {
  configRpc: ConfigRpcClient;
  engineBaseUrl: string;
};

export async function bootstrapRenderer(dependencies: RendererBootstrapDependencies) {
  const apiClient = createApiClient(dependencies.engineBaseUrl);
  const configStore = createConfigStore(createRendererConfigBridge(dependencies.configRpc));
  const sessionStore = createSessionStore(apiClient);
  await configStore.hydrate();

   sessionStore.setupDefaults = {
    name: configStore.appSettings.lastPlayerName ?? '',
    gender: '',
    persona: '',
  };

  sessionStore.submitPlayerProfile = async (profile) => {
    await configStore.saveAppSettings({
      ...configStore.appSettings,
      lastPlayerName: profile.name,
    });

    sessionStore.setupDefaults = {
      name: profile.name,
      gender: profile.gender,
      persona: profile.persona,
    };

    const defaultNewGameInput = getDefaultNewGameInput(configStore.appSettings);

    if (!defaultNewGameInput) {
      sessionStore.bootstrapState = 'error';
      sessionStore.bootstrapError = '当前还没有可用于开始新游戏的默认配置。';
      return;
    }

    await sessionStore.startNewGameWithProfile({
      ...defaultNewGameInput,
      playerProfile: profile,
    });
  };

  return {
    apiClient,
    configStore,
    sessionStore,
  };
}
