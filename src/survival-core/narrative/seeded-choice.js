export function hashString(value) {
  let hash = 2166136261;
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function numberFromSeed(seed, salt = "") {
  let value = hashString(`${seed}:${salt}`);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967296;
}

export function pickFromSeed(items, seed, salt = "") {
  if (!items?.length) {
    return null;
  }
  const index = Math.floor(numberFromSeed(seed, salt) * items.length) % items.length;
  return items[index];
}

export function weightedPickFromSeed(weightedItems, seed, salt = "") {
  const candidates = weightedItems.filter((item) => item.weight > 0);
  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  let cursor = numberFromSeed(seed, salt) * totalWeight;
  for (const item of candidates) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.value;
    }
  }
  return candidates.at(-1)?.value || null;
}
