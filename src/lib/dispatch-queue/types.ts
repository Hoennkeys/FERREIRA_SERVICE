import { z } from "zod";

export const whatsAppGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  flyer_clicked: z.boolean(),
  text_clicked: z.boolean(),
  order: z.number().int().min(0),
});

export const cooldownStateSchema = z.object({
  is_active: z.boolean(),
  ends_at: z.string().datetime().nullable(),
});

export const dispatchQueueStateSchema = z.object({
  groups: z.array(whatsAppGroupSchema),
  cooldown: cooldownStateSchema,
  cooldown_minutes: z.number().int().min(1).max(1440),
});

export type WhatsAppGroup = z.infer<typeof whatsAppGroupSchema>;
export type CooldownState = z.infer<typeof cooldownStateSchema>;
export type DispatchQueueState = z.infer<typeof dispatchQueueStateSchema>;

export const DEFAULT_COOLDOWN_MINUTES = 120;

export const EMPTY_QUEUE: DispatchQueueState = {
  groups: [],
  cooldown: { is_active: false, ends_at: null },
  cooldown_minutes: DEFAULT_COOLDOWN_MINUTES,
};

export function parseQueueState(data: unknown): DispatchQueueState | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;
  const candidate = {
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    cooldown:
      raw.cooldown && typeof raw.cooldown === "object"
        ? raw.cooldown
        : { is_active: false, ends_at: null },
    cooldown_minutes:
      typeof raw.cooldown_minutes === "number"
        ? raw.cooldown_minutes
        : DEFAULT_COOLDOWN_MINUTES,
  };

  const result = dispatchQueueStateSchema.safeParse(candidate);
  return result.success ? result.data : null;
}
