import {
  CLAMPED_STATS,
  DEFAULT_BOAT_STATE,
  DEFAULT_CHARACTERS,
  TRACKED_BOAT_DELTAS,
  LOG_LIMIT,
  TRACKED_STAT_DELTAS,
} from "./state.js";

const INITIAL_SEED = 927413;
const MAX_EVENT_HISTORY = 24;

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createInitialState(metadata = {}) {
  const initialMetadata =
    typeof metadata === "string" ? { language: metadata } : { ...metadata };
  const state = {
    ...initialMetadata,
    language: initialMetadata.language || "ko",
    boat: clone(DEFAULT_BOAT_STATE),
    characters: clone(DEFAULT_CHARACTERS),
    logs: [],
    boatStatDeltas: {},
    characterStatDeltas: {},
    rngSeed: INITIAL_SEED,
  };
  ensureCrisisFieldsMut(state);
  recalculateSocialPressureMut(state);
  addLogMut(state, "log.game_start");
  return state;
}

export function aliveCharacters(state) {
  return state.characters.filter((character) => character.alive);
}

export function aliveCount(state) {
  return aliveCharacters(state).length;
}

export function canUseMinorPower(state) {
  return state.boat.minor_power > 0 && !state.boat.chapter_finished;
}

export function canUseMajorPower(state) {
  return state.boat.major_power > 0 && !state.boat.chapter_finished;
}

export function canFinishChapter(state) {
  return (
    state.boat.turn > state.boat.max_turn ||
    state.boat.chapter_finished ||
    aliveCount(state) <= 2 ||
    state.boat.stability <= 0
  );
}

export function isJudgementDone(state) {
  return Boolean(state.boat.judgement_done);
}

export function getCharacterDelta(state, characterId, statName) {
  return Number(state.characterStatDeltas?.[characterId]?.[statName] || 0);
}

export function getBoatDelta(state, statName) {
  return Number(state.boatStatDeltas?.[statName] || 0);
}

export function useMinorPower(state, powerId) {
  const next = clone(state);
  const beforeBoatStats = snapshotBoatStats(next);
  const beforeStats = snapshotCharacterStats(next);
  if (!consumeMinorPowerMut(next)) {
    return next;
  }

  if (powerId === "whisper_fear") {
    const target = highestAlive(next, "fear");
    if (target) {
      target.fear += 5;
      target.trust -= 2;
      target.accusation_score += 2;
      addLogMut(next, "log.minor_whisper_fear", nameParams(target));
    }
  }

  if (powerId === "nudge_greed") {
    const target = highestAlive(next, "greed");
    if (target) {
      target.greed += 5;
      target.morality -= 2;
      target.accusation_score += 2;
      addLogMut(next, "log.minor_nudge_greed", nameParams(target));
    }
  }

  if (powerId === "seed_doubt") {
    const target = lowestAlive(next, "trust");
    if (target) {
      target.trust -= 5;
      target.accusation_score += 3;
      for (const character of aliveCharacters(next)) {
        if (character.id !== target.id) {
          character.trust -= 1;
        }
      }
      addLogMut(next, "log.minor_seed_doubt", nameParams(target));
    }
  }

  if (powerId === "false_comfort") {
    for (const character of aliveCharacters(next)) {
      character.fear -= 3;
      character.trust += 1;
    }
    next.boat.rescue_chance = Math.max(0, next.boat.rescue_chance - 3);
    next.boat.despair = Math.max(0, next.boat.despair - 1);
    addLogMut(next, "log.minor_false_comfort");
  }

  if (powerId === "heavy_silence") {
    for (const character of aliveCharacters(next)) {
      character.fear += 2;
      character.morality -= 1;
    }
    next.boat.despair += 1;
    addLogMut(next, "log.minor_heavy_silence");
  }

  postPlayerActionMut(next, beforeStats, beforeBoatStats);
  return next;
}

export function useMajorPower(state, powerId) {
  const next = clone(state);
  const beforeBoatStats = snapshotBoatStats(next);
  const beforeStats = snapshotCharacterStats(next);
  if (!consumeMajorPowerMut(next)) {
    return next;
  }

  if (powerId === "reduce_water") {
    next.boat.water = Math.max(0, next.boat.water - 1);
    for (const character of aliveCharacters(next)) {
      character.fear += 8;
      if (character.greed >= 60) {
        character.greed += 5;
        character.accusation_score += 2;
      }
    }
    next.boat.despair += 1;
    addLogMut(next, "log.power_reduce_water");
  }

  if (powerId === "rumor") {
    const target = lowestAlive(next, "trust");
    for (const character of aliveCharacters(next)) {
      character.trust -= 5;
    }
    if (target) {
      target.fear += 10;
      target.accusation_score += 6;
    }
    const influencers = aliveCharacters(next).filter(
      (character) => character.influence >= 60,
    );
    const instigator = highestFrom(influencers, "influence");
    if (instigator) {
      instigator.instigation_count += 1;
    }
    addLogMut(next, "log.power_rumor");
  }

  if (powerId === "hidden_food") {
    const target = highestAlive(next, "greed");
    if (target) {
      target.has_hidden_resource = true;
      target.greed += 10;
      target.hypocrisy_count += 1;
      target.accusation_score += 6;
    }
    addLogMut(next, "log.power_hidden_food");
  }

  if (powerId === "storm") {
    next.boat.storm_level += 1;
    next.boat.stability -= 15;
    next.boat.hull_damage += 8;
    next.boat.water_ingress += 1;
    next.boat.despair += 2;
    for (const character of aliveCharacters(next)) {
      character.fear += 12;
      if (character.health <= 60) {
        character.health -= 5;
      }
    }
    addLogMut(next, "log.power_storm");
  }

  postPlayerActionMut(next, beforeStats, beforeBoatStats);
  return next;
}

export function nextTurn(state) {
  const next = clone(state);
  if (isJudgementDone(next)) {
    clearAllDeltasMut(next);
    addLogMut(next, "log.already_judged");
    return next;
  }

  const beforeBoatStats = snapshotBoatStats(next);
  const beforeStats = snapshotCharacterStats(next);
  ensureCrisisFieldsMut(next);
  decrementEventCooldownsMut(next);
  next.boat.turn += 1;
  applyBasicChangesMut(next);
  recalculateSocialPressureMut(next);
  runEventRulesMut(next);
  checkDeathsMut(next);
  clampCharacterStatsMut(next);
  recalculateSocialPressureMut(next);
  checkEndConditionsMut(next, false);
  if (!isJudgementDone(next)) {
    recoverMinorPowerMut(next);
  }
  recordAllDeltasMut(next, beforeStats, beforeBoatStats);
  return next;
}

export function requestFinishChapter(state) {
  const next = clone(state);
  if (isJudgementDone(next)) {
    clearAllDeltasMut(next);
    return next;
  }

  if (canFinishChapter(next)) {
    finishChapterMut(next);
    return next;
  }

  clearAllDeltasMut(next);
  addLogMut(next, "log.finish_not_ready");
  return next;
}

function addLogMut(state, key, params = {}) {
  state.logs.push({ key, params: { ...params } });
  if (state.logs.length > LOG_LIMIT) {
    state.logs.splice(0, state.logs.length - LOG_LIMIT);
  }
}

function snapshotCharacterStats(state) {
  const snapshot = {};
  for (const character of state.characters) {
    snapshot[character.id] = {};
    for (const statName of TRACKED_STAT_DELTAS) {
      snapshot[character.id][statName] = character[statName] || 0;
    }
  }
  return snapshot;
}

function snapshotBoatStats(state) {
  const snapshot = {};
  ensureCrisisFieldsMut(state);
  for (const statName of TRACKED_BOAT_DELTAS) {
    snapshot[statName] = boatStatValue(state, statName);
  }
  return snapshot;
}

function recordAllDeltasMut(state, beforeStats, beforeBoatStats) {
  recordCharacterStatDeltasMut(state, beforeStats);
  recordBoatStatDeltasMut(state, beforeBoatStats);
}

function recordCharacterStatDeltasMut(state, beforeStats) {
  clearCharacterStatDeltasMut(state);
  for (const character of state.characters) {
    const previousStats = beforeStats[character.id];
    if (!previousStats) {
      continue;
    }
    for (const statName of TRACKED_STAT_DELTAS) {
      const currentValue = character[statName] || 0;
      const previousValue = previousStats[statName] ?? currentValue;
      const delta = currentValue - previousValue;
      if (delta !== 0) {
        state.characterStatDeltas[character.id] ||= {};
        state.characterStatDeltas[character.id][statName] = delta;
      }
    }
  }
}

function recordBoatStatDeltasMut(state, beforeBoatStats) {
  clearBoatStatDeltasMut(state);
  for (const statName of TRACKED_BOAT_DELTAS) {
    const currentValue = boatStatValue(state, statName);
    const previousValue = beforeBoatStats?.[statName] ?? currentValue;
    const delta = currentValue - previousValue;
    if (delta !== 0) {
      state.boatStatDeltas[statName] = delta;
    }
  }
}

function boatStatValue(state, statName) {
  if (statName === "alive_count") {
    return aliveCount(state);
  }
  return Number(state.boat?.[statName] || 0);
}

function clearAllDeltasMut(state) {
  clearBoatStatDeltasMut(state);
  clearCharacterStatDeltasMut(state);
}

function clearBoatStatDeltasMut(state) {
  state.boatStatDeltas = {};
}

function clearCharacterStatDeltasMut(state) {
  state.characterStatDeltas = {};
}

function clampCharacterStatsMut(state) {
  state.boat.water = clamp(Number(state.boat.water || 0), 0, 99);
  state.boat.food = clamp(Number(state.boat.food || 0), 0, 99);
  state.boat.stability = clamp(Number(state.boat.stability || 0), 0, 100);
  state.boat.rescue_chance = clamp(Number(state.boat.rescue_chance || 0), 0, 100);
  state.boat.hull_damage = clamp(Number(state.boat.hull_damage || 0), 0, 100);
  state.boat.water_ingress = clamp(Number(state.boat.water_ingress || 0), 0, 20);
  state.boat.load_pressure = clamp(Number(state.boat.load_pressure || 0), 0, 60);
  state.boat.despair = clamp(Number(state.boat.despair || 0), 0, 40);
  for (const character of state.characters) {
    for (const statName of CLAMPED_STATS) {
      character[statName] = clamp(Number(character[statName] || 0), 0, 100);
    }
  }
}

function consumeMinorPowerMut(state) {
  if (isJudgementDone(state) || state.boat.chapter_finished) {
    clearAllDeltasMut(state);
    addLogMut(state, "log.already_judged");
    return false;
  }

  if (!canUseMinorPower(state)) {
    clearAllDeltasMut(state);
    addLogMut(state, "log.no_minor_power");
    return false;
  }

  state.boat.minor_power -= 1;
  return true;
}

function consumeMajorPowerMut(state) {
  if (isJudgementDone(state) || state.boat.chapter_finished) {
    clearAllDeltasMut(state);
    addLogMut(state, "log.already_judged");
    return false;
  }

  if (!canUseMajorPower(state)) {
    clearAllDeltasMut(state);
    addLogMut(state, "log.no_major_power");
    return false;
  }

  state.boat.major_power -= 1;
  return true;
}

function postPlayerActionMut(state, beforeStats, beforeBoatStats) {
  ensureCrisisFieldsMut(state);
  recalculateSocialPressureMut(state);
  checkDeathsMut(state);
  clampCharacterStatsMut(state);
  checkEndConditionsMut(state, false);
  recalculateSocialPressureMut(state);
  recordAllDeltasMut(state, beforeStats, beforeBoatStats);
}

function checkDeathsMut(state) {
  for (const character of state.characters) {
    if (character.alive && character.health <= 0) {
      character.alive = false;
      character.health = 0;
      character.death_reason ||= "collapse";
      addLogMut(state, "log.death", nameParams(character));
    }
  }
}

function checkEndConditionsMut(state, clearFinishDeltas = true) {
  if (isJudgementDone(state)) {
    return;
  }

  if (state.boat.stability <= 0) {
    state.boat.stability = 0;
    addLogMut(state, "log.capsize");
    for (const character of aliveCharacters(state)) {
      character.death_reason = "capsized";
      character.health -= 999;
    }
    checkDeathsMut(state);
    clampCharacterStatsMut(state);
    finishChapterMut(state, clearFinishDeltas);
    return;
  }

  if (state.boat.turn > state.boat.max_turn) {
    if (!state.boat.rescue_signal_seen && aliveCount(state) > 4) {
      const target = highestTargetPressure(state) || lowestAlive(state, "health");
      if (target) {
        target.alive = false;
        target.health = 0;
        target.death_reason = "exiled";
        target.accusation_score += 8;
        addLogMut(state, "log.final_overload");
        addLogMut(state, "event.exile_vote", {
          target_key: target.name_key,
          actor_key: highestAlive(state, "influence")?.name_key || target.name_key,
        });
      }
    }
    addLogMut(state, "log.max_turn_passed");
    finishChapterMut(state, clearFinishDeltas);
    return;
  }

  if (state.boat.chapter_finished) {
    finishChapterMut(state, clearFinishDeltas);
    return;
  }

  if (aliveCount(state) <= 2) {
    addLogMut(state, "log.too_few");
    finishChapterMut(state, clearFinishDeltas);
  }
}

function finishChapterMut(state, clearDeltas = true) {
  if (isJudgementDone(state)) {
    return;
  }
  if (clearDeltas) {
    clearAllDeltasMut(state);
  }
  state.boat.chapter_finished = true;
  state.boat.judgement_done = true;
  for (const character of state.characters) {
    character.judgement = judgeCharacter(character);
  }
  addLogMut(state, "log.final_judgement_header");
  for (const character of state.characters) {
    addLogMut(state, "log.judgement_result", {
      name_key: character.name_key,
      judgement_key: character.judgement || "judgement.unjudged",
    });
  }
}

function judgeCharacter(character) {
  if (!character.alive && character.sacrifice_count >= 2) {
    return "judgement.sacrificial_victim";
  }
  if (!character.alive && character.death_reason === "exiled") {
    return "judgement.exiled";
  }
  if (!character.alive) {
    return "judgement.victim";
  }
  if (character.betrayal_count >= 2) {
    return "judgement.betrayer";
  }
  if (character.hypocrisy_count >= 2) {
    return "judgement.hypocrite";
  }
  if (character.instigation_count >= 2) {
    return "judgement.instigator";
  }
  if (character.morality <= 20) {
    return "judgement.corrupted_survivor";
  }
  if (character.alive) {
    return "judgement.survivor";
  }
  return "judgement.unjudged";
}

function applyBasicChangesMut(state) {
  ensureCrisisFieldsMut(state);
  state.boat.load_pressure = calculateLoadPressure(state);
  state.boat.water_ingress += Math.floor(state.boat.hull_damage / 25);
  state.boat.hull_damage += Math.max(
    0,
    Math.floor((state.boat.load_pressure - 22) / 8),
  );
  state.boat.despair += 1;
  state.boat.stability -= Math.floor(state.boat.hull_damage / 30);

  for (const character of aliveCharacters(state)) {
    character.health -= 1;
    character.fear += 2;
    if (state.boat.despair >= 6) {
      character.trust -= 1;
    }
    if (state.boat.water_ingress >= 3) {
      character.health -= 1;
    }
    if (state.boat.food <= 1) {
      character.health -= 1;
    }
    if (state.boat.water <= 2) {
      character.fear += 3;
    }
    if (state.boat.hull_damage >= 35 || state.boat.stability <= 40) {
      character.fear += 3;
    }
    if (state.boat.storm_level >= 2) {
      character.health -= 5;
      character.fear += 4;
    }
  }
}

function runEventRulesMut(state) {
  ensureCrisisFieldsMut(state);
  recalculateSocialPressureMut(state);
  const phase = phaseForTurn(state.boat.turn);
  const eligible = EVENT_DEFINITIONS.flatMap((event) => {
    if (isEventOnCooldown(state, event.id) || !event.canRun(state)) {
      return [];
    }

    const recentPenalty = recentEventCount(state, event.id, 5) * 8;
    const phaseBonus = event.phases?.includes(phase) ? 4 : 0;
    const weight = Math.max(
      1,
      event.baseWeight + phaseBonus + event.weight(state) - recentPenalty,
    );
    return [{ event, weight }];
  });

  if (eligible.length === 0) {
    eventSilentTurnMut(state);
    registerEventMut(state, "silent_turn", null, null, 1);
    return true;
  }

  const selected = weightedRandomMut(state, eligible);
  const result = selected.event.apply(state);
  if (!result) {
    eventSilentTurnMut(state);
    registerEventMut(state, "silent_turn", null, null, 1);
    return true;
  }
  registerEventMut(
    state,
    selected.event.id,
    result.actor || null,
    result.target || null,
    selected.event.cooldown,
  );
  return true;
}

const EVENT_DEFINITIONS = [
  {
    id: "rescue_signal",
    baseWeight: 1,
    cooldown: 1,
    phases: ["collapse"],
    canRun: canRareRescueRun,
    weight: (state) => Math.floor(Math.max(0, state.boat.rescue_chance - 55) / 10),
    apply: eventRescueSignalMut,
  },
  {
    id: "hidden_resource_found",
    baseWeight: 12,
    cooldown: 2,
    phases: ["scarcity", "fracture"],
    canRun: (state) =>
      aliveCharacters(state).some((character) => character.has_hidden_resource),
    weight: (state) =>
      aliveCharacters(state).filter((character) => character.has_hidden_resource)
        .length * 4,
    apply: eventHiddenResourceFoundMut,
  },
  {
    id: "supplies_crack_hull",
    baseWeight: 9,
    cooldown: 3,
    phases: ["scarcity", "fracture", "collapse"],
    canRun: (state) => state.boat.load_pressure >= 30,
    weight: (state) => Math.floor(Math.max(0, state.boat.load_pressure - 30) / 2),
    apply: eventSuppliesCrackHullMut,
  },
  {
    id: "leak_spreads",
    baseWeight: 8,
    cooldown: 2,
    phases: ["fracture", "collapse"],
    canRun: (state) => state.boat.water_ingress >= 2 || state.boat.hull_damage >= 25,
    weight: (state) => state.boat.water_ingress + Math.floor(state.boat.hull_damage / 12),
    apply: eventLeakSpreadsMut,
  },
  {
    id: "secret_water_drinking",
    baseWeight: 8,
    cooldown: 3,
    phases: ["scarcity", "fracture"],
    canRun: (state) =>
      state.boat.water > 0 &&
      aliveCharacters(state).some((character) => character.greed >= 70),
    weight: (state) => (state.boat.water <= 2 ? 5 : 0) + Math.floor(state.boat.despair / 4),
    apply: eventSecretWaterDrinkingMut,
  },
  {
    id: "public_accusation",
    baseWeight: 8,
    cooldown: 4,
    phases: ["scarcity", "fracture", "collapse"],
    canRun: (state) => state.boat.despair >= 5 && highestTargetPressure(state, 8),
    weight: (state) => Math.floor((highestTargetPressure(state)?.target_pressure || 0) / 3),
    apply: eventPublicAccusationMut,
  },
  {
    id: "survival_pact",
    baseWeight: 5,
    cooldown: 4,
    phases: ["scarcity", "fracture"],
    canRun: (state) => state.boat.despair >= 4 && Boolean(findAlliancePair(state)),
    weight: () => 2,
    apply: eventSurvivalPactMut,
  },
  {
    id: "exile_vote",
    baseWeight: 11,
    cooldown: 3,
    phases: ["fracture", "collapse"],
    canRun: (state) =>
      survivalPressure(state) >= 12 &&
      aliveCount(state) >= 4 &&
      Boolean(highestTargetPressure(state, 12)),
    weight: (state) => Math.floor(survivalPressure(state) - 10),
    apply: eventExileVoteMut,
  },
  {
    id: "failed_exile_violent",
    baseWeight: 8,
    cooldown: 4,
    phases: ["fracture", "collapse"],
    canRun: (state) =>
      Boolean(state.boat.last_failed_exile_turn) &&
      state.boat.turn - state.boat.last_failed_exile_turn <= 2 &&
      averageStat(state, "fear") >= 70,
    weight: (state) => Math.floor(averageStat(state, "fear") / 10),
    apply: eventFailedExileViolentMut,
  },
  {
    id: "voluntary_sacrifice",
    baseWeight: 8,
    cooldown: 1,
    phases: ["collapse"],
    canRun: (state) =>
      aliveCount(state) >= 4 &&
      survivalPressure(state) >= 16 &&
      aliveCharacters(state).some((character) => character.morality >= 75),
    weight: (state) => Math.floor(survivalPressure(state) / 3),
    apply: eventVoluntarySacrificeNewMut,
  },
  {
    id: "exile_the_weak",
    baseWeight: 6,
    cooldown: 2,
    phases: ["scarcity", "fracture"],
    canRun: (state) =>
      aliveCount(state) >= 4 &&
      (state.boat.water <= 2 ||
        state.boat.stability <= 40 ||
        survivalPressure(state) >= 10),
    weight: (state) => Math.floor(survivalPressure(state) / 4),
    apply: eventExileTheWeakMut,
  },
  {
    id: "nurse_protects",
    baseWeight: 6,
    cooldown: 3,
    phases: ["scarcity", "fracture"],
    canRun: (state) =>
      Boolean(findAliveCharacter(state, "nurse")) &&
      aliveCharacters(state).some((character) => character.health <= 60),
    weight: (state) => Math.floor((100 - (lowestAlive(state, "health")?.health || 100)) / 12),
    apply: eventNurseProtectsMut,
  },
  {
    id: "soldier_takes_order",
    baseWeight: 5,
    cooldown: 3,
    phases: ["fracture"],
    canRun: (state) =>
      Boolean(findAliveCharacter(state, "soldier")) && averageStat(state, "fear") >= 60,
    weight: (state) => Math.floor(averageStat(state, "fear") / 12),
    apply: eventSoldierTakesOrderMut,
  },
  {
    id: "influencer_instigates",
    baseWeight: 7,
    cooldown: 3,
    phases: ["fracture", "collapse"],
    canRun: (state) =>
      Boolean(findAliveCharacter(state, "influencer")) &&
      averageStat(state, "trust") <= 45,
    weight: (state) => Math.floor((55 - averageStat(state, "trust")) / 4),
    apply: eventInfluencerInstigatesMut,
  },
  {
    id: "stowaway_witch_hunt",
    baseWeight: 6,
    cooldown: 4,
    phases: ["fracture", "collapse"],
    canRun: (state) =>
      Boolean(findAliveCharacter(state, "stowaway")) && averageStat(state, "fear") >= 55,
    weight: (state) => Math.floor(averageStat(state, "fear") / 12),
    apply: eventStowawayWitchHuntMut,
  },
  {
    id: "boat_damage",
    baseWeight: 7,
    cooldown: 2,
    phases: ["collapse"],
    canRun: (state) => state.boat.stability <= 35 || state.boat.hull_damage >= 45,
    weight: (state) => Math.floor((100 - state.boat.stability + state.boat.hull_damage) / 12),
    apply: eventBoatDamageMut,
  },
  {
    id: "panic_outburst",
    baseWeight: 6,
    cooldown: 4,
    phases: ["fracture", "collapse"],
    canRun: (state) => aliveCharacters(state).some((character) => character.fear >= 85),
    weight: (state) => Math.floor((highestAlive(state, "fear")?.fear || 0) / 12),
    apply: eventPanicOutburstMut,
  },
  {
    id: "silent_turn",
    baseWeight: 1,
    cooldown: 1,
    phases: ["discomfort"],
    canRun: () => true,
    weight: () => 0,
    apply: eventSilentTurnMut,
  },
];

function eventHiddenResourceFoundMut(state) {
  const candidates = aliveCharacters(state).filter(
    (character) => character.has_hidden_resource,
  );
  if (candidates.length === 0) return null;

  const target = randomFromMut(state, candidates);
  target.has_hidden_resource = false;
  target.trust -= 20;
  target.hypocrisy_count += 1;
  target.accusation_score += 8;
  for (const character of aliveCharacters(state)) {
    if (character.id !== target.id) {
      character.fear += 5;
      addEnemyMut(character, target);
    }
  }
  addLogMut(state, "event.hidden_resource_found", nameParams(target));
  return { target };
}

function eventExileTheWeakMut(state) {
  const crisis = state.boat.water <= 2 || state.boat.stability <= 40;
  if (!crisis || aliveCount(state) < 4) {
    return null;
  }

  const instigator = highestAlive(state, "influence");
  if (!instigator) {
    return null;
  }

  instigator.instigation_count += 1;
  const elder = findAliveCharacter(state, "elder");
  if (elder) {
    elder.fear += 20;
  }
  for (const character of aliveCharacters(state)) {
    character.morality -= 5;
  }
  addLogMut(state, "event.exile_the_weak", nameParams(instigator));
  return { actor: instigator };
}

function eventSecretWaterDrinkingMut(state) {
  if (state.boat.water <= 0) {
    return null;
  }

  const candidates = aliveCharacters(state).filter(
    (character) => character.greed >= 70,
  );
  if (candidates.length === 0) {
    return null;
  }

  const target = highestFrom(candidates, "greed");
  state.boat.water = Math.max(0, state.boat.water - 1);
  target.health += 5;
  target.betrayal_count += 1;
  target.trust -= 15;
  target.accusation_score += 7;
  addLogMut(state, "event.secret_water_drinking", nameParams(target));
  return { actor: target };
}

function eventNurseProtectsMut(state) {
  const nurse = findAliveCharacter(state, "nurse");
  if (!nurse) {
    return null;
  }

  const candidates = aliveCharacters(state).filter(
    (character) => character.health <= 60,
  );
  if (candidates.length === 0) {
    return null;
  }

  const target = lowestFrom(candidates, "health");
  target.health += 10;
  nurse.sacrifice_count += 1;
  nurse.health -= 5;
  nurse.trust += 5;
  addAllianceMut(nurse, target);
  addLogMut(state, "event.nurse_protects", nameParams(nurse));
  return { actor: nurse, target };
}

function eventSoldierTakesOrderMut(state) {
  const soldier = findAliveCharacter(state, "soldier");
  if (!soldier || averageStat(state, "fear") < 60) {
    return null;
  }

  soldier.influence += 5;
  soldier.morality -= 5;
  for (const character of aliveCharacters(state)) {
    character.fear -= 5;
    character.trust -= 3;
  }
  addLogMut(state, "event.soldier_takes_order", nameParams(soldier));
  return { actor: soldier };
}

function eventInfluencerInstigatesMut(state) {
  const influencer = findAliveCharacter(state, "influencer");
  if (!influencer || averageStat(state, "trust") > 45) {
    return null;
  }

  const target = lowestAlive(state, "trust");
  if (!target) {
    return null;
  }

  influencer.instigation_count += 1;
  influencer.hypocrisy_count += 1;
  target.fear += 10;
  target.accusation_score += 5;
  addEnemyMut(influencer, target);
  for (const character of aliveCharacters(state)) {
    character.trust -= 5;
  }
  addLogMut(state, "event.influencer_instigates", nameParams(influencer));
  return { actor: influencer, target };
}

function eventStowawayWitchHuntMut(state) {
  const stowaway = findAliveCharacter(state, "stowaway");
  if (!stowaway || averageStat(state, "fear") < 55) {
    return null;
  }

  const instigator = highestAlive(state, "influence");
  if (!instigator) {
    return null;
  }

  stowaway.fear += 20;
  stowaway.trust -= 10;
  stowaway.accusation_score += 6;
  instigator.instigation_count += 1;
  addEnemyMut(instigator, stowaway);
  for (const character of aliveCharacters(state)) {
    character.morality -= 5;
  }
  addLogMut(state, "event.stowaway_witch_hunt", nameParams(stowaway));
  return { actor: instigator, target: stowaway };
}

function eventVoluntarySacrificeMut(state) {
  if (aliveCount(state) < 5 || state.boat.stability > 35) {
    return null;
  }

  const candidates = aliveCharacters(state).filter(
    (character) => character.morality >= 80,
  );
  if (candidates.length === 0) {
    return null;
  }

  const target = highestFrom(candidates, "morality");
  target.sacrifice_count += 2;
  target.health -= 20;
  for (const character of aliveCharacters(state)) {
    if (character.id !== target.id) {
      character.trust += 5;
      character.morality += 3;
    }
  }
  addLogMut(state, "event.voluntary_sacrifice", nameParams(target));
  return { target };
}

function eventBoatDamageMut(state) {
  if (state.boat.stability > 30) {
    return null;
  }

  for (const character of aliveCharacters(state)) {
    character.health -= 10;
    character.fear += 10;
  }
  state.boat.stability -= 5;
  state.boat.hull_damage += 6;
  state.boat.water_ingress += 1;
  addLogMut(state, "event.boat_damage");
  return {};
}

function eventPanicOutburstMut(state) {
  const candidates = aliveCharacters(state).filter(
    (character) => character.fear >= 85,
  );
  if (candidates.length === 0) {
    return null;
  }

  const target = highestFrom(candidates, "fear");
  const victim = randomFromMut(state, aliveCharacters(state));
  target.trust -= 10;
  target.morality -= 10;
  target.betrayal_count += 1;
  if (victim) {
    victim.health -= 10;
  }
  addLogMut(state, "event.panic_outburst", nameParams(target));
  return { actor: target, target: victim };
}

function eventRescueSignalMut(state) {
  state.boat.rescue_signal_seen = true;
  state.boat.chapter_finished = true;
  addLogMut(state, "event.rescue_signal");
  return {};
}

function eventSilentTurnMut(state) {
  for (const character of aliveCharacters(state)) {
    character.fear += 2;
  }
  addLogMut(state, "event.silent_turn");
  return {};
}

function eventLeakSpreadsMut(state) {
  state.boat.water_ingress += 1;
  state.boat.despair += 1;
  for (const character of aliveCharacters(state)) {
    character.fear += 4;
    if (character.health <= 60) {
      character.health -= 2;
    }
  }
  addLogMut(state, "event.leak_spreads");
  return {};
}

function eventSuppliesCrackHullMut(state) {
  state.boat.hull_damage += 5;
  state.boat.stability -= 4;
  state.boat.despair += 1;
  for (const character of aliveCharacters(state)) {
    character.fear += 3;
  }
  addLogMut(state, "event.supplies_crack_hull");
  return {};
}

function eventPublicAccusationMut(state) {
  const target = highestTargetPressure(state, 8);
  const actor = highestFrom(
    aliveCharacters(state).filter((character) => character.id !== target?.id),
    "influence",
  );
  if (!actor || !target) return null;

  actor.instigation_count += 1;
  target.trust -= 10;
  target.fear += 8;
  target.accusation_score += 4;
  addEnemyMut(actor, target);
  for (const character of aliveCharacters(state)) {
    character.morality -= 2;
  }
  addLogMut(state, "event.public_accusation", actorTargetParams(actor, target));
  return { actor, target };
}

function eventSurvivalPactMut(state) {
  const pair = findAlliancePair(state);
  if (!pair) return null;
  const [actor, target] = pair;
  addAllianceMut(actor, target);
  actor.trust += 4;
  target.trust += 4;

  const pressureTarget = highestFrom(
    aliveCharacters(state).filter(
      (character) => character.id !== actor.id && character.id !== target.id,
    ),
    "target_pressure",
  );
  if (pressureTarget) {
    pressureTarget.accusation_score += 4;
  }
  addLogMut(state, "event.survival_pact", actorTargetParams(actor, target));
  return { actor, target };
}

function eventExileVoteMut(state) {
  const target = highestTargetPressure(state, 12);
  const actor = highestFrom(
    aliveCharacters(state).filter((character) => character.id !== target?.id),
    "influence",
  );
  if (!actor || !target) return null;

  const allianceCount = (target.alliances || []).filter((id) =>
    findAliveCharacter(state, id),
  ).length;
  const exileScore =
    target.target_pressure + actor.influence / 10 + survivalPressure(state) / 2;
  const defenseScore = target.trust / 8 + target.influence / 10 + allianceCount * 5;

  actor.instigation_count += 1;
  addEnemyMut(actor, target);
  if (exileScore > defenseScore) {
    target.alive = false;
    target.health = 0;
    target.death_reason = "exiled";
    target.betrayal_count += target.greed >= 70 ? 1 : 0;
    state.boat.despair += 2;
    state.boat.load_pressure = calculateLoadPressure(state);
    addLogMut(state, "event.exile_vote", actorTargetParams(actor, target));
  } else {
    target.trust -= 15;
    target.fear += 15;
    target.health -= 8;
    target.accusation_score += 5;
    state.boat.last_failed_exile_turn = state.boat.turn;
    addLogMut(state, "event.exile_resisted", actorTargetParams(actor, target));
  }
  return { actor, target };
}

function eventFailedExileViolentMut(state) {
  const actor = highestAlive(state, "influence");
  const target = highestTargetPressure(state, 8);
  if (!actor || !target || actor.id === target.id) return null;
  actor.health -= 8;
  target.health -= 12;
  actor.fear += 5;
  target.fear += 8;
  addEnemyMut(actor, target);
  const bystander = randomFromMut(
    state,
    aliveCharacters(state).filter(
      (character) => character.id !== actor.id && character.id !== target.id,
    ),
  );
  if (bystander) {
    bystander.health -= 5;
    bystander.fear += 6;
  }
  addLogMut(state, "event.failed_exile_violent", actorTargetParams(actor, target));
  return { actor, target };
}

function eventVoluntarySacrificeNewMut(state) {
  const candidates = aliveCharacters(state).filter(
    (character) => character.morality >= 75,
  );
  if (candidates.length === 0) return null;
  const target = highestFrom(candidates, "morality");
  target.alive = false;
  target.health = 0;
  target.death_reason = "sacrifice";
  target.sacrifice_count += 3;
  state.boat.despair = Math.max(0, state.boat.despair - 2);
  state.boat.load_pressure = calculateLoadPressure(state);
  for (const character of aliveCharacters(state)) {
    character.trust += 6;
    character.morality += 4;
    character.fear = Math.max(0, character.fear - 3);
  }
  addLogMut(state, "event.voluntary_sacrifice_new", { target_key: target.name_key });
  return { target };
}

function recoverMinorPowerMut(state) {
  state.boat.minor_power = Math.min(
    state.boat.minor_power + 1,
    state.boat.max_minor_power,
  );
}

function ensureCrisisFieldsMut(state) {
  state.boat.hull_damage = Number(state.boat.hull_damage || 0);
  state.boat.water_ingress = Number(state.boat.water_ingress || 0);
  state.boat.load_pressure = Number(
    state.boat.load_pressure || calculateLoadPressure(state),
  );
  state.boat.despair = Number(state.boat.despair || 0);
  state.boat.rescue_signal_seen = Boolean(state.boat.rescue_signal_seen);
  state.boat.event_history ||= [];
  state.boat.event_cooldowns ||= {};
  for (const character of state.characters) {
    character.alliances ||= [];
    character.enemies ||= [];
    character.accusation_score = Number(character.accusation_score || 0);
    character.target_pressure = Number(character.target_pressure || 0);
    character.death_reason ||= "";
  }
}

function calculateLoadPressure(state) {
  return aliveCount(state) * 4 + Number(state.boat.water || 0) + Number(state.boat.food || 0);
}

function survivalPressure(state) {
  return (
    Number(state.boat.despair || 0) +
    Number(state.boat.water_ingress || 0) * 2 +
    Number(state.boat.hull_damage || 0) / 10 +
    Math.max(0, aliveCount(state) - 4) * 3
  );
}

function recalculateSocialPressureMut(state) {
  ensureCrisisFieldsMut(state);
  state.boat.load_pressure = calculateLoadPressure(state);
  for (const character of state.characters) {
    const lowHealthPenalty = character.health <= 40 ? 6 : character.health <= 60 ? 3 : 0;
    character.target_pressure = Math.round(
      clamp(
        character.fear / 10 +
          character.greed / 12 +
          character.betrayal_count * 6 +
          character.hypocrisy_count * 5 +
          character.accusation_score -
          character.trust / 12 -
          character.influence / 14 -
          character.morality / 16 +
          lowHealthPenalty,
        0,
        40,
      ),
    );
  }
}

function phaseForTurn(turn) {
  if (turn <= 4) return "discomfort";
  if (turn <= 9) return "scarcity";
  if (turn <= 14) return "fracture";
  return "collapse";
}

function decrementEventCooldownsMut(state) {
  ensureCrisisFieldsMut(state);
  for (const eventId of Object.keys(state.boat.event_cooldowns)) {
    state.boat.event_cooldowns[eventId] -= 1;
    if (state.boat.event_cooldowns[eventId] <= 0) {
      delete state.boat.event_cooldowns[eventId];
    }
  }
}

function isEventOnCooldown(state, eventId) {
  return Number(state.boat.event_cooldowns?.[eventId] || 0) > 0;
}

function recentEventCount(state, eventId, windowSize) {
  const fromTurn = state.boat.turn - windowSize;
  return (state.boat.event_history || []).filter(
    (entry) => entry.id === eventId && entry.turn >= fromTurn,
  ).length;
}

function registerEventMut(state, eventId, actor, target, cooldown = 0) {
  ensureCrisisFieldsMut(state);
  state.boat.event_history.push({
    turn: state.boat.turn,
    id: eventId,
    actor_id: actor?.id || null,
    target_id: target?.id || null,
  });
  if (state.boat.event_history.length > MAX_EVENT_HISTORY) {
    state.boat.event_history.splice(0, state.boat.event_history.length - MAX_EVENT_HISTORY);
  }
  if (cooldown > 0) {
    state.boat.event_cooldowns[eventId] = cooldown;
  }
}

function weightedRandomMut(state, weightedEvents) {
  const total = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomFloatMut(state) * total;
  for (const item of weightedEvents) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }
  return weightedEvents[weightedEvents.length - 1];
}

function canRareRescueRun(state) {
  if (state.boat.turn < 14 || aliveCount(state) !== 6) return false;
  if (state.boat.rescue_chance < 55) return false;
  if (state.boat.hull_damage > 25 || state.boat.water_ingress > 2) return false;
  if (averageStat(state, "trust") < 55) return false;
  const chance = Math.min(0.15, 0.05 + (state.boat.rescue_chance - 55) * 0.005);
  return randomFloatMut(state) < chance;
}

function highestTargetPressure(state, minimum = 0) {
  const target = highestFrom(aliveCharacters(state), "target_pressure");
  if (!target || target.target_pressure < minimum) return null;
  return target;
}

function findAlliancePair(state) {
  const alive = aliveCharacters(state);
  let bestPair = null;
  let bestScore = -Infinity;
  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const left = alive[i];
      const right = alive[j];
      if ((left.alliances || []).includes(right.id)) continue;
      if ((left.enemies || []).includes(right.id) || (right.enemies || []).includes(left.id)) {
        continue;
      }
      if (left.trust < 45 || right.trust < 45) continue;
      const score = left.trust + right.trust - Math.abs(left.morality - right.morality);
      if (score > bestScore) {
        bestScore = score;
        bestPair = [left, right];
      }
    }
  }
  return bestPair;
}

function addAllianceMut(left, right) {
  if (!left || !right || left.id === right.id) return;
  left.alliances ||= [];
  right.alliances ||= [];
  left.enemies = (left.enemies || []).filter((id) => id !== right.id);
  right.enemies = (right.enemies || []).filter((id) => id !== left.id);
  if (!left.alliances.includes(right.id)) left.alliances.push(right.id);
  if (!right.alliances.includes(left.id)) right.alliances.push(left.id);
}

function addEnemyMut(left, right) {
  if (!left || !right || left.id === right.id) return;
  left.enemies ||= [];
  right.enemies ||= [];
  left.alliances = (left.alliances || []).filter((id) => id !== right.id);
  right.alliances = (right.alliances || []).filter((id) => id !== left.id);
  if (!left.enemies.includes(right.id)) left.enemies.push(right.id);
  if (!right.enemies.includes(left.id)) right.enemies.push(left.id);
}

function actorTargetParams(actor, target) {
  return {
    actor_key: actor?.name_key || actor?.name || "Unknown",
    target_key: target?.name_key || target?.name || "Unknown",
  };
}

function highestAlive(state, statName) {
  return highestFrom(aliveCharacters(state), statName);
}

function lowestAlive(state, statName) {
  return lowestFrom(aliveCharacters(state), statName);
}

function highestFrom(pool, statName) {
  let selected = null;
  for (const character of pool) {
    if (!selected || character[statName] > selected[statName]) {
      selected = character;
    }
  }
  return selected;
}

function lowestFrom(pool, statName) {
  let selected = null;
  for (const character of pool) {
    if (!selected || character[statName] < selected[statName]) {
      selected = character;
    }
  }
  return selected;
}

function findAliveCharacter(state, id) {
  return state.characters.find((character) => character.id === id && character.alive);
}

function averageStat(state, statName) {
  const alive = aliveCharacters(state);
  if (alive.length === 0) {
    return 0;
  }
  return (
    alive.reduce((total, character) => total + Number(character[statName] || 0), 0) /
    alive.length
  );
}

function nameParams(character) {
  return { name_key: character.name_key || character.name || "Unknown" };
}

function randomFloatMut(state) {
  state.rngSeed = (Math.imul(state.rngSeed, 1664525) + 1013904223) >>> 0;
  return state.rngSeed / 4294967296;
}

function randomFromMut(state, pool) {
  if (pool.length === 0) {
    return null;
  }
  const index = Math.floor(randomFloatMut(state) * pool.length);
  return pool[Math.min(index, pool.length - 1)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
