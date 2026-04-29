import path from 'node:path';

export function getAppPaths(baseDir: string) {
  const dataDir = path.join(baseDir, 'riji-luoluo');

  return {
    dataDir,
    savesDir: path.join(dataDir, 'saves'),
    credentialsFile: path.join(dataDir, 'config', 'credentials.json'),
    settingsFile: path.join(dataDir, 'config', 'settings.json'),
  };
}
