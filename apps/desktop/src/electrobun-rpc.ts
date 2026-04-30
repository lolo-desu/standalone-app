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

type BunRpcFactory = {
  defineRPC: <Schema = ElectrobunConfigRpcSchema>(config: {
    handlers: {
      requests: ConfigRpcHandlers;
    };
  }) => unknown;
};

type RendererRpc = {
  request: ConfigRpcClient['request'];
};

type WebviewRpcFactory = {
  defineRPC: <Schema = ElectrobunConfigRpcSchema>(config: {
    handlers: {
      requests: {};
    };
  }) => RendererRpc;
};

export function createElectrobunMainConfigRpc(factory: BunRpcFactory, handlers: ConfigRpcHandlers) {
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

export type { BunRpcFactory, RendererRpc, WebviewRpcFactory };
