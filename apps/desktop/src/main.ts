import { getAppPaths } from './paths';

async function bootstrap() {
  const paths = getAppPaths(process.env.HOME || process.cwd());

  console.log('App paths', paths);
  // Create engine child process and main window here in the real implementation.
}

bootstrap();
