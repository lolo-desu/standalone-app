import { readFileSync } from 'node:fs';

const FIRST_GALGAME_SCENE_PATH = new URL(
  '../../../../lolocard/src/日记络络/第一条消息/1_galgame.txt',
  import.meta.url
);

type GalgameItem = Record<string, string>;

function getGalgameYamlLines(script: string): string[] {
  const lines = script.split(/\r?\n/);
  const galgameStart = lines.findIndex((line) => line.trim() === '<galgame>');
  const galgameEnd = lines.findIndex((line, index) => index > galgameStart && line.trim() === '</galgame>');

  if (galgameStart === -1 || galgameEnd === -1) {
    return lines;
  }

  const galgameLines = lines.slice(galgameStart + 1, galgameEnd);
  const yamlFenceStart = galgameLines.findIndex((line) => line.trim() === '```yaml');

  if (yamlFenceStart === -1) {
    return galgameLines;
  }

  const yamlFenceEnd = galgameLines.findIndex((line, index) => index > yamlFenceStart && line.trim() === '```');

  if (yamlFenceEnd === -1) {
    return galgameLines.slice(yamlFenceStart + 1);
  }

  return galgameLines.slice(yamlFenceStart + 1, yamlFenceEnd);
}

function assignField(item: GalgameItem, line: string) {
  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    return;
  }

  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();

  if (!key) {
    return;
  }

  item[key] = value;
}

function parseGalgameItems(script: string): GalgameItem[] {
  const items: GalgameItem[] = [];
  let currentItem: GalgameItem | null = null;

  for (const line of getGalgameYamlLines(script)) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.startsWith('- ')) {
      if (currentItem) {
        items.push(currentItem);
      }

      currentItem = {};
      assignField(currentItem, trimmedLine.slice(2));
      continue;
    }

    if (!currentItem) {
      continue;
    }

    assignField(currentItem, trimmedLine);
  }

  if (currentItem) {
    items.push(currentItem);
  }

  return items;
}

export function getFirstMessage() {
  const galgameScript = readFileSync(FIRST_GALGAME_SCENE_PATH, 'utf8');
  const firstDialog = parseGalgameItems(galgameScript).find(
    (item) => item.speaker === '络络' && typeof item.speech === 'string'
  );

  if (!firstDialog) {
    throw new Error('Unable to locate the first Luoluo dialog in 1_galgame.txt');
  }

  return {
    speaker: firstDialog.speaker,
    text: firstDialog.speech,
  };
}
