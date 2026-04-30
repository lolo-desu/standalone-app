import type { ConfigRpcClient } from '../config-rpc';
import { createRendererConfigBridge } from '../config-rpc';
import { createApiClient } from './api/client';
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

  return {
    apiClient,
    configStore,
    sessionStore,
  };
}
