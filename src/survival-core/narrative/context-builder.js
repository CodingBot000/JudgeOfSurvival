export function buildNarrativeContext(state, scenario, entry, tools = {}) {
  if (scenario?.narrative?.buildContext) {
    return scenario.narrative.buildContext(state, entry, tools);
  }

  return {
    language: tools.language || state.language || "ko",
    eventId: entry.eventId || entry.id,
    intent: entry.intent || "observe",
    actorId: entry.actorId || null,
    targetId: entry.targetId || null,
    tags: entry.tags || [],
    turn: entry.turn || 0,
    variantSeed: entry.variantSeed,
    tokens: { ...(entry.params || {}) },
  };
}
