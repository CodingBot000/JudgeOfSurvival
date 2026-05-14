import { weightedPickFromSeed } from "../../../survival-core/narrative/seeded-choice.js";
import { deriveDialogueSignals } from "../dialogueSignals.js";
import { dialogueLinesEn } from "./lines.en.js";
import { dialogueLinesKo } from "./lines.ko.js";
import { dialogueLineSets } from "./line-sets.js";

const LINE_TABLES = {
  ko: dialogueLinesKo,
  en: dialogueLinesEn,
};

export function selectDialogueLine({
  state,
  character,
  language = state?.language || "ko",
  signals = deriveDialogueSignals(state),
  recentLineIds = [],
  seedSalt = "",
}) {
  if (!state || !character?.alive) {
    return null;
  }

  const setKeys = getCharacterMutterSetKeys(character, state, signals);
  const candidates = dialogueLineSets.filter(
    (line) =>
      line.characterId === character.id &&
      line.setKeys.some((setKey) => setKeys.includes(setKey)),
  );
  const fallbackCandidates = dialogueLineSets.filter(
    (line) => line.characterId === character.id && line.setKeys.includes("neutral"),
  );
  const pool = candidates.length > 0 ? candidates : fallbackCandidates;

  if (pool.length === 0) {
    return null;
  }

  const weighted = pool.map((line) => {
    const matchedSetCount = line.setKeys.filter((setKey) => setKeys.includes(setKey)).length;
    const recentlyUsed = recentLineIds.includes(line.id);
    return {
      value: line,
      weight: Math.max(1, line.weight + matchedSetCount * 4) * (recentlyUsed ? 0.25 : 1),
    };
  });
  const seed = `${state.rngSeed}:${state.simulation?.blockIndex || 0}:${character.id}`;
  const selected = weightedPickFromSeed(weighted, seed, seedSalt);
  const text = resolveDialogueText(language, selected?.id);

  if (!selected || !text) {
    return null;
  }

  return {
    id: selected.id,
    characterId: character.id,
    setKeys,
    tags: selected.tags || [],
    text,
  };
}

export function resolveDialogueText(language, lineId) {
  const primary = LINE_TABLES[language] || LINE_TABLES.ko;
  return primary[lineId] || LINE_TABLES.ko[lineId] || "";
}

export function getCharacterMutterSetKeys(character, state, signals = deriveDialogueSignals(state)) {
  const global = signals.global || {};
  const characterSignal = signals.characters?.[character.id] || {};
  const boat = state.boat || {};
  const setKeys = ["neutral"];

  if (global.dominantTopic === "water" || global.tags?.includes("water_shortage")) {
    setKeys.push("water_low");
  }
  if (global.dominantTopic === "food" || global.tags?.includes("food_shortage")) {
    setKeys.push("food_low");
  }
  if (global.dominantTopic === "damage" || global.tags?.includes("boat_damage")) {
    setKeys.push("boat_breaking");
  }
  if (global.dominantTopic === "fear" || global.tags?.includes("panic")) {
    setKeys.push("panic_personal");
  }
  if (global.dominantTopic === "suspicion" || global.tags?.includes("distrust")) {
    setKeys.push("distrust_group");
  }
  if (global.phase === "panic" || boat.despair >= 8) {
    setKeys.push("collapse_phase");
  }
  if (boat.rescue_chance >= 35) {
    setKeys.push("hope_rescue");
  }
  if (characterSignal.tags?.includes("afraid") || characterSignal.state === "panicking") {
    setKeys.push("panic_personal");
  }
  if (characterSignal.tags?.includes("self_interested")) {
    setKeys.push("selfish_calculation");
  }
  if (characterSignal.tags?.includes("isolated") || characterSignal.state === "withdrawn") {
    setKeys.push("distrust_group");
  }
  if (characterSignal.tags?.includes("under_suspicion") || characterSignal.state === "accused") {
    setKeys.push("hostile_relationship");
  }
  if (characterSignal.tags?.includes("has_enemy")) {
    setKeys.push("hostile_relationship");
  }
  if (character.has_hidden_resource) {
    setKeys.push("hidden_resource_secret");
  }
  if (character.morality >= 75 && state.characters?.some((candidate) => !candidate.alive)) {
    setKeys.push("moral_grief");
  }

  return [...new Set(setKeys)];
}

export function dialogueLineIdsForLanguage(language) {
  return Object.keys(LINE_TABLES[language] || {});
}
