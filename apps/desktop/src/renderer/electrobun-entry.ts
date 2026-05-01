import { createElectrobunConfigRpcClient, createElectrobunRendererConfigRpc, loadRendererRuntime, type WebviewRpcFactory } from '../electrobun-rpc';
import { bootstrapRenderer as defaultBootstrapRenderer } from './main';

type ElectroviewInstance = {
  rpc: {
    request: {
      loadCredentialProfiles: (...args: unknown[]) => Promise<unknown>;
      saveCredentialProfiles: (...args: unknown[]) => Promise<unknown>;
      loadAppSettings: (...args: unknown[]) => Promise<unknown>;
      saveAppSettings: (...args: unknown[]) => Promise<unknown>;
      loadRendererRuntime: (...args: unknown[]) => Promise<{ engineBaseUrl: string }>;
    };
  };
};

type ElectroviewConstructor = WebviewRpcFactory & {
  new (options: { rpc: ReturnType<typeof createElectrobunRendererConfigRpc> }): ElectroviewInstance;
};

type RendererRuntime = Awaited<ReturnType<typeof defaultBootstrapRenderer>>;

type BootstrapElectrobunRendererDependencies = {
  Electroview: ElectroviewConstructor;
  bootstrapRenderer?: typeof defaultBootstrapRenderer;
  locationHref?: string;
};

export async function bootstrapElectrobunRenderer(dependencies: BootstrapElectrobunRendererDependencies): Promise<RendererRuntime & { electroview: ElectroviewInstance }> {
  console.info('[renderer:electrobun-entry] creating renderer RPC');
  const bootstrapRenderer = dependencies.bootstrapRenderer ?? defaultBootstrapRenderer;

  const rpc = createElectrobunRendererConfigRpc(dependencies.Electroview);
  const electroview = new dependencies.Electroview({ rpc });
  console.info('[renderer:electrobun-entry] loading renderer runtime');
  const rendererRuntime = await loadRendererRuntime(electroview.rpc);
  console.info('[renderer:electrobun-entry] bootstrapping renderer runtime');
  const runtime = await bootstrapRenderer({
    configRpc: createElectrobunConfigRpcClient(electroview.rpc),
    engineBaseUrl: rendererRuntime.engineBaseUrl,
  });

  return {
    ...runtime,
    electroview,
  };
}
