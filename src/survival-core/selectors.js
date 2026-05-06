export function aliveActors(state, actorKey = "characters") {
  return (state[actorKey] || []).filter((actor) => actor.alive);
}

export function aliveCount(state, actorKey = "characters") {
  return aliveActors(state, actorKey).length;
}

export function highestFrom(pool, statName) {
  let selected = null;
  for (const actor of pool) {
    if (!selected || Number(actor[statName] || 0) > Number(selected[statName] || 0)) {
      selected = actor;
    }
  }
  return selected;
}

export function lowestFrom(pool, statName) {
  let selected = null;
  for (const actor of pool) {
    if (!selected || Number(actor[statName] || 0) < Number(selected[statName] || 0)) {
      selected = actor;
    }
  }
  return selected;
}

export function findAliveActor(state, id, actorKey = "characters") {
  return (state[actorKey] || []).find((actor) => actor.id === id && actor.alive);
}

export function averageStat(state, statName, actorKey = "characters") {
  const alive = aliveActors(state, actorKey);
  if (alive.length === 0) {
    return 0;
  }
  return (
    alive.reduce((total, actor) => total + Number(actor[statName] || 0), 0) /
    alive.length
  );
}
