import App from './App.vue';
import type { ConfigRpcClient } from '../config-rpc';
import { bootstrapRenderer as bootstrapRendererRuntime } from './bootstrap';

type RendererMainDependencies = {
  configRpc: ConfigRpcClient;
  engineBaseUrl: string;
};

export async function bootstrapRenderer(dependencies: RendererMainDependencies) {
  const runtime = await bootstrapRendererRuntime(dependencies);
  return {
    App,
    ...runtime,
  };
}
