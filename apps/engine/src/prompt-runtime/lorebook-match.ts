import type { LorebookAsset, LorebookEntry, PromptRuntimeContext } from './types';

function flattenValue(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenValue(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap((item) => flattenValue(item));
  }

  return [];
}

function includesAllTerms(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}

function includesAnyTerm(haystack: string, terms: string[]): boolean {
  return terms.some((term) => haystack.includes(term));
}

function buildSearchText(context: PromptRuntimeContext, scanDepth: number | null): string {
  const history = scanDepth === null ? context.chatHistory : context.chatHistory.slice(-scanDepth);
  const { wiBefore: _wiBefore, wiAfter: _wiAfter, ...nonLoreSections } = context.sections;

  return [
    ...history.map((message) => message.content),
    context.session.sceneState.text,
    context.playerName,
    context.characterName,
    ...Object.values(nonLoreSections),
    ...flattenValue(context.statData),
  ]
    .filter((value) => value.length > 0)
    .join('\n');
}

function matchesEntry(context: PromptRuntimeContext, entry: LorebookEntry): boolean {
  if (!entry.enabled || entry.keywords.length === 0) {
    return false;
  }

  const haystack = buildSearchText(context, entry.scanDepth);
  const primaryMatched = entry.matchMode === 'all'
    ? includesAllTerms(haystack, entry.keywords)
    : includesAnyTerm(haystack, entry.keywords);

  if (!primaryMatched) {
    return false;
  }

  return entry.secondaryKeywords.length === 0 || includesAnyTerm(haystack, entry.secondaryKeywords);
}

export function matchLorebookEntries(
  context: PromptRuntimeContext,
  lorebook: LorebookAsset | null | undefined,
): LorebookEntry[] {
  if (!lorebook) {
    return [];
  }

  const seen = new Set<string>();

  return lorebook.entries
    .filter((entry) => matchesEntry(context, entry))
    .filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    })
    .sort((left, right) => left.order - right.order);
}
