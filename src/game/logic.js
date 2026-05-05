import {
  CLAMPED_STATS,
  DEFAULT_BOAT_STATE,
  DEFAULT_CHARACTERS,
  LANGUAGE_CODES,
  LOG_LIMIT,
  TRACKED_STAT_DELTAS,
  TRANSLATIONS,
} from "./data.js";

const INITIAL_SEED = 927413;

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createInitialState(language = "ko") {
  const state = {
    language: LANGUAGE_CODES.includes(language) ? language : "ko",
    boat: clone(DEFAULT_BOAT_STATE),
    characters: clone(DEFAULT_CHARACTERS),
    logs: [],
    characterStatDeltas: {},
    rngSeed: INITIAL_SEED,
  };
  addLogMut(state, "log.game_start");
  return state;
}

export function setLanguage(state, language) {
  const next = clone(state);
  next.language = LANGUAGE_CODES.includes(language) ? language : "ko";
  return next;
}

export function translate(stateOrLanguage, textKey, params = {}) {
  const language =
    typeof stateOrLanguage === "string"
      ? stateOrLanguage
      : stateOrLanguage?.language || "ko";
  const primary = TRANSLATIONS[language] || TRANSLATIONS.ko;
  const fallback = TRANSLATIONS.en;
  const template = primary[textKey] || fallback[textKey] || textKey;
  return applyParams(language, template, params);
}

export function getLanguageOptions(state) {
  return LANGUAGE_CODES.map((code) => ({
    code,
    label: translate(state, `language.${code}`),
  }));
}

export function formatLogEntry(state, entry) {
  return translate(state, entry.key, entry.params || {});
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

export function characterName(state, character) {
  return translate(state, character.name_key || character.name || "Unknown");
}

export function characterRole(state, character) {
  return translate(state, character.role_key || character.role || "Unknown");
}

export function characterJudgement(state, character) {
  return translate(state, character.judgement || "judgement.unjudged");
}

export function getCharacterDelta(state, characterId, statName) {
  return Number(state.characterStatDeltas?.[characterId]?.[statName] || 0);
}

export function useMinorPower(state, powerId) {
  const next = clone(state);
  const beforeStats = snapshotCharacterStats(next);
  if (!consumeMinorPowerMut(next)) {
    return next;
  }

  if (powerId === "whisper_fear") {
    const target = highestAlive(next, "fear");
    if (target) {
      target.fear += 5;
      target.trust -= 2;
      addLogMut(next, "log.minor_whisper_fear", nameParams(target));
    }
  }

  if (powerId === "nudge_greed") {
    const target = highestAlive(next, "greed");
    if (target) {
      target.greed += 5;
      target.morality -= 2;
      addLogMut(next, "log.minor_nudge_greed", nameParams(target));
    }
  }

  if (powerId === "seed_doubt") {
    const target = lowestAlive(next, "trust");
    if (target) {
      target.trust -= 5;
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
    addLogMut(next, "log.minor_false_comfort");
  }

  if (powerId === "heavy_silence") {
    for (const character of aliveCharacters(next)) {
      character.fear += 2;
      character.morality -= 1;
    }
    addLogMut(next, "log.minor_heavy_silence");
  }

  postPlayerActionMut(next, beforeStats);
  return next;
}

export function useMajorPower(state, powerId) {
  const next = clone(state);
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
      }
    }
    addLogMut(next, "log.power_reduce_water");
  }

  if (powerId === "rumor") {
    const target = lowestAlive(next, "trust");
    for (const character of aliveCharacters(next)) {
      character.trust -= 5;
    }
    if (target) {
      target.fear += 10;
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
    }
    addLogMut(next, "log.power_hidden_food");
  }

  if (powerId === "storm") {
    next.boat.storm_level += 1;
    next.boat.stability -= 15;
    for (const character of aliveCharacters(next)) {
      character.fear += 12;
      if (character.health <= 60) {
        character.health -= 5;
      }
    }
    addLogMut(next, "log.power_storm");
  }

  postPlayerActionMut(next, beforeStats);
  return next;
}

export function nextTurn(state) {
  const next = clone(state);
  if (isJudgementDone(next)) {
    clearCharacterStatDeltasMut(next);
    addLogMut(next, "log.already_judged");
    return next;
  }

  const beforeStats = snapshotCharacterStats(next);
  next.boat.turn += 1;
  applyBasicChangesMut(next);
  runEventRulesMut(next);
  checkDeathsMut(next);
  clampCharacterStatsMut(next);
  checkEndConditionsMut(next, false);
  if (!isJudgementDone(next)) {
    recoverMinorPowerMut(next);
  }
  recordCharacterStatDeltasMut(next, beforeStats);
  return next;
}

export function requestFinishChapter(state) {
  const next = clone(state);
  if (isJudgementDone(next)) {
    clearCharacterStatDeltasMut(next);
    return next;
  }

  if (canFinishChapter(next)) {
    finishChapterMut(next);
    return next;
  }

  clearCharacterStatDeltasMut(next);
  addLogMut(next, "log.finish_not_ready");
  return next;
}

export function renderGameToText(state, screen = "trial") {
  const visibleCharacters = state.characters.map((character, index) => ({
    id: character.id,
    name: characterName(state, character),
    role: characterRole(state, character),
    alive: character.alive,
    position: lifeboatPositionForIndex(index),
    health: character.health,
    fear: character.fear,
    greed: character.greed,
    trust: character.trust,
    morality: character.morality,
    influence: character.influence,
    has_hidden_resource: character.has_hidden_resource,
    betrayal_count: character.betrayal_count,
    sacrifice_count: character.sacrifice_count,
    hypocrisy_count: character.hypocrisy_count,
    instigation_count: character.instigation_count,
    judgement: character.judgement ? characterJudgement(state, character) : "",
  }));

  return JSON.stringify({
    coordinate_system:
      "Lifeboat visual positions use normalized x/y in a left-to-right, top-to-bottom SVG viewport.",
    screen,
    language: state.language,
    boat: { ...state.boat },
    alive_count: aliveCount(state),
    controls: {
      minor_powers_enabled: canUseMinorPower(state),
      major_powers_enabled: canUseMajorPower(state),
      next_turn_enabled: !isJudgementDone(state),
      finish_enabled: !isJudgementDone(state),
    },
    characters: visibleCharacters,
    recent_logs: state.logs.slice(-6).map((entry) => formatLogEntry(state, entry)),
  });
}

function applyParams(language, template, params) {
  let result = template;
  for (const [rawKey, rawValue] of Object.entries(params || {})) {
    const key = rawKey.endsWith("_key") ? rawKey.slice(0, -4) : rawKey;
    const value = rawKey.endsWith("_key")
      ? translate(language, String(rawValue))
      : String(rawValue);
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
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

function clearCharacterStatDeltasMut(state) {
  state.characterStatDeltas = {};
}

function clampCharacterStatsMut(state) {
  for (const character of state.characters) {
    for (const statName of CLAMPED_STATS) {
      character[statName] = clamp(Number(character[statName] || 0), 0, 100);
    }
  }
}

function consumeMinorPowerMut(state) {
  if (isJudgementDone(state) || state.boat.chapter_finished) {
    clearCharacterStatDeltasMut(state);
    addLogMut(state, "log.already_judged");
    return false;
  }

  if (!canUseMinorPower(state)) {
    clearCharacterStatDeltasMut(state);
    addLogMut(state, "log.no_minor_power");
    return false;
  }

  state.boat.minor_power -= 1;
  return true;
}

function consumeMajorPowerMut(state) {
  if (isJudgementDone(state) || state.boat.chapter_finished) {
    clearCharacterStatDeltasMut(state);
    addLogMut(state, "log.already_judged");
    return false;
  }

  if (!canUseMajorPower(state)) {
    clearCharacterStatDeltasMut(state);
    addLogMut(state, "log.no_major_power");
    return false;
  }

  state.boat.major_power -= 1;
  return true;
}

function postPlayerActionMut(state, beforeStats) {
  checkDeathsMut(state);
  clampCharacterStatsMut(state);
  checkEndConditionsMut(state, false);
  recordCharacterStatDeltasMut(state, beforeStats);
}

function checkDeathsMut(state) {
  for (const character of state.characters) {
    if (character.alive && character.health <= 0) {
      character.alive = false;
      character.health = 0;
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
      character.health -= 999;
    }
    checkDeathsMut(state);
    clampCharacterStatsMut(state);
    finishChapterMut(state, clearFinishDeltas);
    return;
  }

  if (state.boat.turn > state.boat.max_turn) {
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
    clearCharacterStatDeltasMut(state);
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
  for (const character of aliveCharacters(state)) {
    character.fear += 3;
    if (state.boat.water <= 2) {
      character.fear += 5;
    }
    if (state.boat.stability <= 40) {
      character.fear += 5;
    }
    if (state.boat.storm_level >= 2) {
      character.health -= 5;
    }
  }
}

function runEventRulesMut(state) {
  return (
    eventHiddenResourceFoundMut(state) ||
    eventExileTheWeakMut(state) ||
    eventSecretWaterDrinkingMut(state) ||
    eventNurseProtectsMut(state) ||
    eventSoldierTakesOrderMut(state) ||
    eventInfluencerInstigatesMut(state) ||
    eventStowawayWitchHuntMut(state) ||
    eventVoluntarySacrificeMut(state) ||
    eventBoatDamageMut(state) ||
    eventPanicOutburstMut(state) ||
    eventRescueSignalMut(state) ||
    eventSilentTurnMut(state)
  );
}

function eventHiddenResourceFoundMut(state) {
  const candidates = aliveCharacters(state).filter(
    (character) => character.has_hidden_resource,
  );
  if (candidates.length === 0 || randomFloatMut(state) >= 0.5) {
    return false;
  }

  const target = randomFromMut(state, candidates);
  target.has_hidden_resource = false;
  target.trust -= 20;
  target.hypocrisy_count += 1;
  for (const character of aliveCharacters(state)) {
    if (character.id !== target.id) {
      character.fear += 5;
    }
  }
  addLogMut(state, "event.hidden_resource_found", nameParams(target));
  return true;
}

function eventExileTheWeakMut(state) {
  const crisis = state.boat.water <= 2 || state.boat.stability <= 40;
  if (!crisis || aliveCount(state) < 4) {
    return false;
  }

  const instigator = highestAlive(state, "influence");
  if (!instigator) {
    return false;
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
  return true;
}

function eventSecretWaterDrinkingMut(state) {
  if (state.boat.water <= 0) {
    return false;
  }

  const candidates = aliveCharacters(state).filter(
    (character) => character.greed >= 70,
  );
  if (candidates.length === 0) {
    return false;
  }

  const target = highestFrom(candidates, "greed");
  state.boat.water = Math.max(0, state.boat.water - 1);
  target.health += 5;
  target.betrayal_count += 1;
  target.trust -= 15;
  addLogMut(state, "event.secret_water_drinking", nameParams(target));
  return true;
}

function eventNurseProtectsMut(state) {
  const nurse = findAliveCharacter(state, "nurse");
  if (!nurse) {
    return false;
  }

  const candidates = aliveCharacters(state).filter(
    (character) => character.health <= 60,
  );
  if (candidates.length === 0) {
    return false;
  }

  const target = lowestFrom(candidates, "health");
  target.health += 10;
  nurse.sacrifice_count += 1;
  nurse.health -= 5;
  nurse.trust += 5;
  addLogMut(state, "event.nurse_protects", nameParams(nurse));
  return true;
}

function eventSoldierTakesOrderMut(state) {
  const soldier = findAliveCharacter(state, "soldier");
  if (!soldier || averageStat(state, "fear") < 60) {
    return false;
  }

  soldier.influence += 5;
  soldier.morality -= 5;
  for (const character of aliveCharacters(state)) {
    character.fear -= 5;
    character.trust -= 3;
  }
  addLogMut(state, "event.soldier_takes_order", nameParams(soldier));
  return true;
}

function eventInfluencerInstigatesMut(state) {
  const influencer = findAliveCharacter(state, "influencer");
  if (!influencer || averageStat(state, "trust") > 40) {
    return false;
  }

  const target = lowestAlive(state, "trust");
  if (!target) {
    return false;
  }

  influencer.instigation_count += 1;
  influencer.hypocrisy_count += 1;
  target.fear += 10;
  for (const character of aliveCharacters(state)) {
    character.trust -= 5;
  }
  addLogMut(state, "event.influencer_instigates", nameParams(influencer));
  return true;
}

function eventStowawayWitchHuntMut(state) {
  const stowaway = findAliveCharacter(state, "stowaway");
  if (!stowaway || averageStat(state, "fear") < 55) {
    return false;
  }

  const instigator = highestAlive(state, "influence");
  if (!instigator) {
    return false;
  }

  stowaway.fear += 20;
  stowaway.trust -= 10;
  instigator.instigation_count += 1;
  for (const character of aliveCharacters(state)) {
    character.morality -= 5;
  }
  addLogMut(state, "event.stowaway_witch_hunt", nameParams(stowaway));
  return true;
}

function eventVoluntarySacrificeMut(state) {
  if (aliveCount(state) < 5 || state.boat.stability > 35) {
    return false;
  }

  const candidates = aliveCharacters(state).filter(
    (character) => character.morality >= 80,
  );
  if (candidates.length === 0) {
    return false;
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
  return true;
}

function eventBoatDamageMut(state) {
  if (state.boat.stability > 30) {
    return false;
  }

  for (const character of aliveCharacters(state)) {
    character.health -= 10;
    character.fear += 10;
  }
  state.boat.stability -= 5;
  addLogMut(state, "event.boat_damage");
  return true;
}

function eventPanicOutburstMut(state) {
  const candidates = aliveCharacters(state).filter(
    (character) => character.fear >= 85,
  );
  if (candidates.length === 0) {
    return false;
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
  return true;
}

function eventRescueSignalMut(state) {
  if (state.boat.turn < 7 || state.boat.rescue_chance < 30) {
    return false;
  }
  if (randomFloatMut(state) >= 0.35) {
    return false;
  }

  state.boat.chapter_finished = true;
  addLogMut(state, "event.rescue_signal");
  return true;
}

function eventSilentTurnMut(state) {
  for (const character of aliveCharacters(state)) {
    character.fear += 2;
  }
  addLogMut(state, "event.silent_turn");
  return true;
}

function recoverMinorPowerMut(state) {
  state.boat.minor_power = Math.min(
    state.boat.minor_power + 1,
    state.boat.max_minor_power,
  );
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

function lifeboatPositionForIndex(index) {
  const positions = [
    { x: 0.2, y: 0.44 },
    { x: 0.38, y: 0.35 },
    { x: 0.56, y: 0.43 },
    { x: 0.74, y: 0.35 },
    { x: 0.32, y: 0.62 },
    { x: 0.64, y: 0.62 },
  ];
  return positions[index] || { x: 0.5, y: 0.5 };
}
