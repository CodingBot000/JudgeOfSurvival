export function applyEffectsMut(state, effects) {
  for (const effect of effects) {
    effect(state);
  }
  return state;
}
