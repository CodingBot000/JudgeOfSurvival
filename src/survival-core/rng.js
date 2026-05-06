export function randomFloatMut(state) {
  state.rngSeed = (Math.imul(state.rngSeed, 1664525) + 1013904223) >>> 0;
  return state.rngSeed / 4294967296;
}

export function randomFromMut(state, pool) {
  if (!pool.length) {
    return null;
  }
  const index = Math.floor(randomFloatMut(state) * pool.length);
  return pool[Math.min(index, pool.length - 1)];
}

export function weightedRandomMut(state, weightedItems) {
  const total = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomFloatMut(state) * total;
  for (const item of weightedItems) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }
  return weightedItems[weightedItems.length - 1];
}
