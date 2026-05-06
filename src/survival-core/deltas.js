export function getDeltaValue(deltaBag, statName) {
  return Number(deltaBag?.[statName] || 0);
}

export function clearDeltaBagMut(state, key) {
  state[key] = {};
}
