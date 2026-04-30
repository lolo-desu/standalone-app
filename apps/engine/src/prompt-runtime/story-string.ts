const TRIM_TOKEN_DETECTION_PATTERN = /\{\{\s*trim\s*\}\}/;
const TRIM_TOKEN_PATTERN = /\{\{\s*trim\s*\}\}/g;

function resolveValue(data: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, data);
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === 0) {
    return false;
  }

  return String(value).length > 0;
}

export function renderStoryString(template: string, data: Record<string, unknown>): string {
  const shouldTrim = TRIM_TOKEN_DETECTION_PATTERN.test(template);
  const renderedConditionals = template.replace(
    /\{\{#if\s+([^\s{}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key: string, content: string) => (hasValue(resolveValue(data, key)) ? content : ''),
  );

  const renderedPlaceholders = renderedConditionals.replace(
    /\{\{\s*([^\s{}#\/][^{}]*?)\s*\}\}/g,
    (_, rawKey: string) => {
      const key = rawKey.trim();

      if (key === 'trim') {
        return '';
      }

      const value = resolveValue(data, key);

      return value === null || value === undefined ? '' : String(value);
    },
  );

  const withoutTrimMarker = renderedPlaceholders.replace(TRIM_TOKEN_PATTERN, '');

  return shouldTrim ? withoutTrimMarker.trim() : withoutTrimMarker;
}
