import type { ConfigRpcHandlers } from './config-rpc';

import { bootstrap as defaultBootstrap } from './bootstrap';
import { createElectrobunMainConfigRpc, type BunRpcFactory } from './electrobun-rpc';

type DesktopBootstrapResult = Awaited<ReturnType<typeof defaultBootstrap>>;

type BrowserWindowOptions = {
  title: string;
  url: string;
  rpc: unknown;
};

type BrowserWindowConstructor = new (options: BrowserWindowOptions) => unknown;

type LaunchElectrobunAppDependencies = {
  bootstrap?: () => Promise<DesktopBootstrapResult>;
  BrowserView: BunRpcFactory;
  BrowserWindow: BrowserWindowConstructor;
};

function createWindowUrl(engineBaseUrl: string) {
  void engineBaseUrl;
  return 'views://renderer/index.html';
}

export async function launchElectrobunApp(dependencies: LaunchElectrobunAppDependencies) {
  const bootstrap = dependencies.bootstrap ?? defaultBootstrap;
  const runtime = await bootstrap();
  const options = createWindowOptions(runtime.configRpcHandlers, dependencies.BrowserView, runtime.engineBaseUrl);
  const window = new dependencies.BrowserWindow(options);

  return {
    runtime,
    rpc: options.rpc,
    window,
  };
}

function createWindowOptions(configRpcHandlers: ConfigRpcHandlers, BrowserView: BunRpcFactory, engineBaseUrl: string): BrowserWindowOptions {
  return {
    title: '日记络络',
    url: createWindowUrl(engineBaseUrl),
    rpc: createElectrobunMainConfigRpc(BrowserView, {
      ...configRpcHandlers,
      loadRendererRuntime() {
        return { engineBaseUrl };
      },
    }),
  };
}

export { createWindowOptions, createWindowUrl };
