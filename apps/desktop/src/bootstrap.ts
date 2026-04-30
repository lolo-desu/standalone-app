import { createConfigRpcHandlers } from './config-rpc';
import { createConfigStore } from './config-store';
import { getAppPaths } from './paths';
import { createEngineEnvironment, getRuntimeHomeDir, launchEngineServer } from './runtime';

type RuntimeEnvironment = Record<string, string | undefined>;
type EngineLaunchResult = {
  baseUrl: string;
};

type BootstrapDependencies = {
  env?: RuntimeEnvironment;
  launchEngine?: (input: { env: RuntimeEnvironment; paths: ReturnType<typeof getAppPaths> }) => Promise<EngineLaunchResult>;
  log?: (...args: unknown[]) => void;
};

export async function bootstrap(dependencies: BootstrapDependencies = {}) {
  const env = dependencies.env ?? process.env;
  const log = dependencies.log ?? console.log;
  const launchEngine = dependencies.launchEngine ?? launchEngineServer;
  const paths = getAppPaths(getRuntimeHomeDir(env));
  const engineEnv = createEngineEnvironment(paths, env);
  const configStore = createConfigStore({
    credentialsFile: paths.credentialsFile,
    settingsFile: paths.settingsFile,
  });
  const configRpcHandlers = createConfigRpcHandlers(configStore);

  log('App paths', paths);
  const engine = await launchEngine({ env: engineEnv, paths });
  log('Engine env', { RIJI_LUOLUO_SAVES_DIR: engineEnv.RIJI_LUOLUO_SAVES_DIR });
  log('Engine base URL', engine.baseUrl);

  return {
    paths,
    engineEnv,
    engineBaseUrl: engine.baseUrl,
    configRpcHandlers,
  };
}
