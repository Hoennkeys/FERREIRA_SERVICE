import type { DispatchQueueState, WhatsAppGroup } from "./types";

/** Re-assigns sequential `order` (0..n-1) based on current order. */
export function normalizeOrder(groups: WhatsAppGroup[]): WhatsAppGroup[] {
  return [...groups]
    .sort((a, b) => a.order - b.order)
    .map((g, index) => ({ ...g, order: index }));
}

/** Sends a group to the bottom of the queue (highest order). */
function rotateToEnd(groups: WhatsAppGroup[], id: string): WhatsAppGroup[] {
  const maxOrder = groups.reduce((max, g) => Math.max(max, g.order), -1);
  const moved = groups.map((g) =>
    g.id === id ? { ...g, order: maxOrder + 1 } : g,
  );
  return normalizeOrder(moved);
}

/** True when every group has completed the full protocol (flyer + text). */
function isRoundComplete(groups: WhatsAppGroup[]): boolean {
  return (
    groups.length > 0 &&
    groups.every((g) => g.flyer_clicked && g.text_clicked)
  );
}

/**
 * Deactivates the cooldown once its `ends_at` has passed. Pure and idempotent,
 * so it is safe to call on every read.
 */
export function expireCooldown(
  state: DispatchQueueState,
  now = Date.now(),
): DispatchQueueState {
  const { cooldown } = state;
  if (!cooldown.is_active || !cooldown.ends_at) return state;

  const ends = new Date(cooldown.ends_at).getTime();
  if (Number.isNaN(ends) || now < ends) return state;

  return { ...state, cooldown: { is_active: false, ends_at: null } };
}

/**
 * Applies a flyer/text click to a group. When both clicks are set the group
 * rotates to the end of the queue. When the rotation completes a full round
 * (all groups dispatched), the cooldown is armed and clicks are reset.
 */
export function applyClick(
  state: DispatchQueueState,
  id: string,
  field: "flyer_clicked" | "text_clicked",
  now = Date.now(),
): DispatchQueueState {
  const target = state.groups.find((g) => g.id === id);
  if (!target) return state;

  const completesProtocol =
    field === "flyer_clicked"
      ? !target.flyer_clicked && target.text_clicked
      : !target.text_clicked && target.flyer_clicked;

  let groups = state.groups.map((g) =>
    g.id === id ? { ...g, [field]: true } : g,
  );

  if (completesProtocol) {
    groups = rotateToEnd(groups, id);
  }

  if (isRoundComplete(groups)) {
    const endsAt = new Date(now + state.cooldown_minutes * 60_000).toISOString();
    const reset = normalizeOrder(
      groups.map((g) => ({ ...g, flyer_clicked: false, text_clicked: false })),
    );
    return {
      ...state,
      groups: reset,
      cooldown: { is_active: true, ends_at: endsAt },
    };
  }

  return { ...state, groups };
}
