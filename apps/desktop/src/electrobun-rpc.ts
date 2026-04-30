import type { ConfigRpcClient, ConfigRpcHandlers } from './config-rpc';
import type { AppSettings, CredentialProfile } from './config-store';

type ConfigRpcRequestSchema = {
  loadCredentialProfiles: {
    params: {};
    response: { profiles: CredentialProfile[] };
  };
  saveCredentialProfiles: {
    params: { profiles: CredentialProfile[] };
    response: void;
  };
  loadAppSettings: {
    params: {};
    response: { settings: AppSettings };
  };
  saveAppSettings: {
    params: { settings: AppSettings };
    response: void;
  };
  loadRendererRuntime: {
    params: {};
    response: { engineBaseUrl: string };
  };
};

export type ElectrobunConfigRpcSchema = {
  bun: {
    requests: ConfigRpcRequestSchema;
    messages: {};
  };
  webview: {
    requests: {};
    messages: {};
  };
};

type MainRpcHandlers = ConfigRpcHandlers & {
  loadRendererRuntime: (_payload: {}) => Promise<{ engineBaseUrl: string }> | { engineBaseUrl: string };
};

type BunRpcFactory = {
  defineRPC: <Schema = ElectrobunConfigRpcSchema>(config: {
    handlers: {
      requests: MainRpcHandlers;
    };
  }) => unknown;
};

type RendererRpc = {
  request: ConfigRpcClient['request'] & {
    loadRendererRuntime: (_payload: {}) => Promise<{ engineBaseUrl: string }>;
  };
};

type WebviewRpcFactory = {
  defineRPC: <Schema = ElectrobunConfigRpcSchema>(config: {
    handlers: {
      requests: {};
    };
  }) => RendererRpc;
};

export function createElectrobunMainConfigRpc(factory: BunRpcFactory, handlers: MainRpcHandlers) {
  return factory.defineRPC<ElectrobunConfigRpcSchema>({
    handlers: {
      requests: handlers,
    },
  });
}

export function createElectrobunRendererConfigRpc(factory: WebviewRpcFactory) {
  return factory.defineRPC<ElectrobunConfigRpcSchema>({
    handlers: {
      requests: {},
    },
  });
}

export function createElectrobunConfigRpcClient(rpc: RendererRpc): ConfigRpcClient {
  return {
    request: rpc.request,
  };
}

export async function loadRendererRuntime(rpc: RendererRpc) {
  return rpc.request.loadRendererRuntime({});
}

export type { BunRpcFactory, MainRpcHandlers, RendererRpc, WebviewRpcFactory };
