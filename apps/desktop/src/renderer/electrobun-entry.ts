import { createElectrobunConfigRpcClient, createElectrobunRendererConfigRpc, type WebviewRpcFactory } from '../electrobun-rpc';
import { bootstrapRenderer as defaultBootstrapRenderer } from './bootstrap';

type ElectroviewInstance = {
  rpc: {
    request: {
      loadCredentialProfiles: (...args: unknown[]) => Promise<unknown>;
      saveCredentialProfiles: (...args: unknown[]) => Promise<unknown>;
      loadAppSettings: (...args: unknown[]) => Promise<unknown>;
      saveAppSettings: (...args: unknown[]) => Promise<unknown>;
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

export function getEngineBaseUrlFromLocation(locationHref: string) {
  const engineBaseUrl = new URL(locationHref).searchParams.get('engineBaseUrl');

  if (!engineBaseUrl) {
    throw new Error('Missing engine base URL in renderer location');
  }

  return engineBaseUrl;
}

export async function bootstrapElectrobunRenderer(dependencies: BootstrapElectrobunRendererDependencies): Promise<RendererRuntime & { electroview: ElectroviewInstance }> {
  const bootstrapRenderer = dependencies.bootstrapRenderer ?? defaultBootstrapRenderer;
  const locationHref = dependencies.locationHref ?? globalThis.location?.href;

  if (!locationHref) {
    throw new Error('Renderer location is not available');
  }

  const rpc = createElectrobunRendererConfigRpc(dependencies.Electroview);
  const electroview = new dependencies.Electroview({ rpc });
  const runtime = await bootstrapRenderer({
    configRpc: createElectrobunConfigRpcClient(electroview.rpc),
    engineBaseUrl: getEngineBaseUrlFromLocation(locationHref),
  });

  return {
    ...runtime,
    electroview,
  };
}
