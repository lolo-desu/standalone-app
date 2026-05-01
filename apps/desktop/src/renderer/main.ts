import App from './App';
import type { ConfigRpcClient } from '../config-rpc';
import { bootstrapRenderer as bootstrapRendererRuntime } from './bootstrap';

type RendererMainDependencies = {
  configRpc: ConfigRpcClient;
  engineBaseUrl: string;
};

export async function bootstrapRenderer(dependencies: RendererMainDependencies) {
  console.info('[renderer:main] bootstrapRenderer start');
  const runtime = await bootstrapRendererRuntime(dependencies);
  console.info('[renderer:main] bootstrapRenderer resolved');
  return {
    App,
    ...runtime,
  };
}
