import { z } from 'zod';

import {
  InvestigationEntrySchema,
  LogEntrySchema,
  SceneStateSchema,
  TimelineNodeSchema,
} from './runtime';

export const SessionSchema = z
  .object({
    sessionMeta: z
      .object({
        id: z.string(),
        workId: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
      .strict(),
    modelConfig: z
      .object({
        providerId: z.string(),
        credentialProfileId: z.string(),
        storyModel: z.string(),
        logicModel: z.string().nullable().default(null),
        useDualModel: z.boolean(),
      })
      .strict(),
    gameState: z
      .object({
        playerLocation: z.string(),
        luoluoLocation: z.string(),
        currentLocation: z.string(),
        availableActions: z.array(z.enum(['interact', 'move', 'investigate'])),
      })
      .strict(),
    variableState: z
      .object({
        stat_data: z.record(z.string(), z.any()),
      })
      .strict(),
    timelineState: z
      .object({
        nodes: z.array(TimelineNodeSchema),
      })
      .strict(),
    logState: z
      .object({
        entries: z.array(LogEntrySchema),
      })
      .strict(),
    sceneState: SceneStateSchema,
    investigationState: z
      .object({
        entries: z.array(InvestigationEntrySchema),
      })
      .strict(),
    saveMeta: z
      .object({
        quickSlotId: z.string().nullable(),
        autoSlotId: z.string().nullable(),
        manualSlotIds: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export const sessionSchema = SessionSchema;

export type Session = z.infer<typeof SessionSchema>;

export function parseSession(input: unknown): Session {
  return SessionSchema.parse(input);
}
