import { weightedRandomMut } from "./rng.js";

export function runWeightedEventMut(state, eventDefinitions, context) {
  const phase = context.phaseForTurn(state);
  const eligible = eventDefinitions.flatMap((event) => {
    if (context.isOnCooldown(state, event.id) || !event.canRun(state)) {
      return [];
    }

    const recentPenalty = context.recentEventCount(state, event.id, 5) * 8;
    const phaseBonus = event.phases?.includes(phase) ? 4 : 0;
    const weight = Math.max(
      1,
      event.baseWeight + phaseBonus + event.weight(state) - recentPenalty,
    );
    return [{ event, weight }];
  });

  if (eligible.length === 0) {
    return context.runFallback(state);
  }

  const selected = weightedRandomMut(state, eligible);
  const result = selected.event.apply(state);
  if (!result) {
    return context.runFallback(state);
  }

  context.registerEvent(
    state,
    selected.event.id,
    result.actor || null,
    result.target || null,
    selected.event.cooldown,
  );
  return true;
}
