import os from 'node:os';

import { createEngineRequestHandler } from '../../engine/src/server';

type RuntimeEnvironment = Record<string, string | undefined>;

type PathsLike = {
  savesDir: string;
};

type EngineServer = {
  port: number;
  stop?: (closeActiveConnections?: boolean) => void | Promise<void>;
};

type EngineServerFactory = (options: {
  fetch: (request: Request) => Response | Promise<Response>;
  hostname: string;
  port: number;
}) => EngineServer;

type LaunchEngineServerInput = {
  env: RuntimeEnvironment;
  hostname?: string;
  paths: PathsLike;
  port?: number;
  serve?: EngineServerFactory;
};

export function getRuntimeHomeDir(env: RuntimeEnvironment, fallbackCwd = process.cwd()) {
  if (env.HOME) {
    return env.HOME;
  }

  if (env.USERPROFILE) {
    return env.USERPROFILE;
  }

  const systemHomeDir = os.homedir();

  if (systemHomeDir) {
    return systemHomeDir;
  }

  return fallbackCwd;
}

export function createEngineEnvironment(paths: PathsLike, env: RuntimeEnvironment): RuntimeEnvironment {
  return {
    ...env,
    RIJI_LUOLUO_SAVES_DIR: paths.savesDir,
  };
}

export function createEngineBaseUrl(input: { hostname?: string; port: number }) {
  return `http://${input.hostname ?? '127.0.0.1'}:${input.port}`;
}

function getDefaultEngineServerFactory(): EngineServerFactory {
  const bun = (globalThis as { Bun?: { serve?: EngineServerFactory } }).Bun;

  if (!bun?.serve) {
    throw new Error('Bun.serve is not available in this runtime');
  }

  return bun.serve.bind(bun);
}

export async function launchEngineServer(input: LaunchEngineServerInput) {
  const hostname = input.hostname ?? '127.0.0.1';
  const port = input.port ?? 0;
  const serve = input.serve ?? getDefaultEngineServerFactory();
  const handleRequest = createEngineRequestHandler({
    savesDir: input.paths.savesDir,
  });
  const server = serve({
    fetch: handleRequest,
    hostname,
    port,
  });

  return {
    baseUrl: createEngineBaseUrl({
      hostname,
      port: server.port,
    }),
    server,
  };
}
