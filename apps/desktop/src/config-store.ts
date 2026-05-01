import fs from 'node:fs';
import path from 'node:path';

type ConfigStorePaths = {
  credentialsFile: string;
  settingsFile: string;
};

type AppSettings = {
  defaultProviderId: string | null;
  defaultCredentialProfileId: string | null;
  defaultStoryModel: string | null;
  defaultLogicModel: string | null;
  useDualModel: boolean;
  lastPlayerName: string | null;
};

type CredentialProfile = {
  id: string;
  providerId: string;
  label: string;
  apiKey: string;
  baseUrl: string | null;
};

function createDefaultAppSettings(): AppSettings {
  return {
    defaultProviderId: null,
    defaultCredentialProfileId: null,
    defaultStoryModel: null,
    defaultLogicModel: null,
    useDualModel: false,
    lastPlayerName: null,
  };
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFileAtomically(filePath: string, value: unknown) {
  ensureParentDir(filePath);

  const tempFilePath = `${filePath}.${process.pid}.tmp`;

  fs.writeFileSync(tempFilePath, JSON.stringify(value, null, 2));
  fs.renameSync(tempFilePath, filePath);
}

function readJsonFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function parseCredentialProfiles(payload: unknown): CredentialProfile[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.id !== 'string' ||
      typeof entry.providerId !== 'string' ||
      typeof entry.label !== 'string' ||
      typeof entry.apiKey !== 'string' ||
      !(entry.baseUrl === null || typeof entry.baseUrl === 'string')
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        providerId: entry.providerId,
        label: entry.label,
        apiKey: entry.apiKey,
        baseUrl: entry.baseUrl,
      },
    ];
  });
}

function parseAppSettings(payload: unknown): AppSettings {
  if (!payload || typeof payload !== 'object') {
    return createDefaultAppSettings();
  }

  const record = payload as Record<string, unknown>;

  return {
    defaultProviderId: typeof record.defaultProviderId === 'string' ? record.defaultProviderId : null,
    defaultCredentialProfileId:
      typeof record.defaultCredentialProfileId === 'string' ? record.defaultCredentialProfileId : null,
    defaultStoryModel: typeof record.defaultStoryModel === 'string' ? record.defaultStoryModel : null,
    defaultLogicModel: typeof record.defaultLogicModel === 'string' ? record.defaultLogicModel : null,
    useDualModel: record.useDualModel === true,
    lastPlayerName: typeof record.lastPlayerName === 'string' ? record.lastPlayerName : null,
  };
}

export function createConfigStore(paths: ConfigStorePaths) {
  return {
    loadCredentialProfiles() {
      return parseCredentialProfiles(readJsonFile(paths.credentialsFile));
    },
    saveCredentialProfiles(profiles: CredentialProfile[]) {
      writeJsonFileAtomically(paths.credentialsFile, profiles);
    },
    loadAppSettings() {
      return parseAppSettings(readJsonFile(paths.settingsFile));
    },
    saveAppSettings(settings: AppSettings) {
      writeJsonFileAtomically(paths.settingsFile, settings);
    },
  };
}

export type { AppSettings, CredentialProfile };
