import { z } from 'zod';

import type { LorebookAsset, LorebookEntry } from './types';

const LorebookSourceEntrySchema = z
  .object({
    uid: z.union([z.string(), z.number()]).optional(),
    key: z.array(z.string()).default([]),
    keysecondary: z.array(z.string()).default([]),
    selective: z.boolean().default(false),
    order: z.number().int().default(100),
    position: z.number().int().default(0),
    disable: z.boolean().default(false),
    content: z.string().default(''),
    comment: z.string().default(''),
    extensions: z
      .object({
        scan_depth: z.number().int().positive().optional(),
      })
      .partial()
      .default({}),
  })
  .passthrough();

const LorebookSourceSchema = z
  .object({
    name: z.string().default('Lorebook'),
    entries: z.record(z.string(), LorebookSourceEntrySchema).default({}),
  })
  .passthrough();

function toInsertionPosition(position: number): LorebookEntry['insertionPosition'] {
  return position === 1 ? 'after_history' : 'before_history';
}

function normalizeKeywords(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

export function normalizeLorebook(input: unknown): LorebookAsset {
  const parsed = LorebookSourceSchema.parse(input);

  return {
    kind: 'lorebook',
    name: parsed.name,
    entries: Object.entries(parsed.entries).map(([fallbackId, entry]) => ({
      id: String(entry.uid ?? fallbackId),
      text: entry.content,
      enabled: !entry.disable,
      keywords: normalizeKeywords(entry.key),
      secondaryKeywords: normalizeKeywords(entry.keysecondary),
      matchMode: entry.selective ? 'all' : 'any',
      scanDepth: entry.extensions.scan_depth ?? null,
      insertionPosition: toInsertionPosition(entry.position),
      order: entry.order,
      comment: entry.comment,
      rawSource: entry,
    })),
    rawSource: parsed,
  };
}

export function exportLorebook(lorebook: LorebookAsset): Record<string, unknown> {
  return {
    name: lorebook.name,
    entries: Object.fromEntries(
      lorebook.entries.map((entry) => [
        entry.id,
        {
          uid: entry.id,
          key: entry.keywords,
          keysecondary: entry.secondaryKeywords,
          selective: entry.matchMode === 'all',
          order: entry.order,
          position: entry.insertionPosition === 'after_history' ? 1 : 0,
          disable: !entry.enabled,
          content: entry.text,
          comment: entry.comment,
          extensions: entry.scanDepth === null ? {} : { scan_depth: entry.scanDepth },
        },
      ]),
    ),
  };
}
