import { hashString } from "./seeded-choice.js";

export const NARRATIVE_LOG_TYPE = "narrative";

export function createNarrativeLogEntry(state, input) {
  const id = input.id || input.key || input.eventId;
  const actorId = input.actorId || input.actor?.id || null;
  const targetId = input.targetId || input.target?.id || null;
  const turn = Number(input.turn ?? state.environment?.turn ?? state.turn ?? 0);

  return {
    type: NARRATIVE_LOG_TYPE,
    key: input.fallbackKey || input.key || input.id,
    id,
    turn,
    eventId: input.eventId || id,
    intent: input.intent || "observe",
    actorId,
    targetId,
    params: { ...(input.params || {}) },
    tags: [...(input.tags || [])],
    deltas: input.deltas ? { ...input.deltas } : {},
    variantSeed:
      input.variantSeed ??
      hashString([
        state.initialSeed,
        state.rngSeed,
        turn,
        state.logs?.length || 0,
        id,
        actorId,
        targetId,
      ].join(":")),
    storyletId: input.storyletId || "",
    templateId: input.templateId || "",
  };
}

export function isNarrativeLogEntry(entry) {
  return entry?.type === NARRATIVE_LOG_TYPE;
}
