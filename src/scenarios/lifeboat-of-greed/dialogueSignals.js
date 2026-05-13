const PHASE_TAGS = ["calm", "uneasy", "strained", "panic"];

export function deriveGlobalDialogueState(state) {
  const alive = aliveCharacters(state);
  const averageFear = average(alive.map((character) => character.fear));
  const averageTrust = average(alive.map((character) => character.trust));
  const boat = state.boat || {};
  const riskTags = [];

  if (boat.water <= 2) riskTags.push("water_shortage");
  if (boat.food <= 1) riskTags.push("food_shortage");
  if (boat.hull_damage >= 35 || boat.water_ingress >= 3) riskTags.push("boat_damage");
  if (boat.despair >= 7) riskTags.push("despair");
  if (averageTrust <= 40) riskTags.push("distrust");
  if (averageFear >= 70) riskTags.push("panic");

  return {
    phase: tensionPhase(averageFear, averageTrust, boat),
    dominantTopic: dominantTopic(boat, averageFear, averageTrust),
    averageFear: Math.round(averageFear),
    averageTrust: Math.round(averageTrust),
    shouldSurfaceDialogue: alive.length > 2 && !boat.judgement_done,
    tags: [...new Set(riskTags)],
  };
}

export function deriveCharacterDialogueState(character, state) {
  if (!character?.alive) {
    return {
      characterId: character?.id || "",
      state: "silent",
      urgency: 0,
      target: false,
      tags: ["dead"],
    };
  }

  const tags = [];
  if (character.fear >= 75) tags.push("afraid");
  if (character.greed >= 75 || character.has_hidden_resource) tags.push("self_interested");
  if (character.trust <= 35) tags.push("isolated");
  if (character.morality >= 75) tags.push("protective");
  if (character.target_pressure >= 12) tags.push("under_suspicion");
  if ((character.enemies || []).length > 0) tags.push("has_enemy");

  return {
    characterId: character.id,
    state: characterState(character),
    urgency: Math.round(
      clamp(character.fear / 2 + character.target_pressure + (100 - character.health) / 4, 0, 100),
    ),
    target: character.target_pressure >= 12,
    tags,
  };
}

export function deriveDialogueSignals(state) {
  return {
    global: deriveGlobalDialogueState(state),
    characters: Object.fromEntries(
      (state.characters || []).map((character) => [
        character.id,
        deriveCharacterDialogueState(character, state),
      ]),
    ),
  };
}

function aliveCharacters(state) {
  return (state.characters || []).filter((character) => character.alive);
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function tensionPhase(averageFear, averageTrust, boat) {
  const score =
    averageFear +
    Number(boat.despair || 0) * 4 +
    Number(boat.water_ingress || 0) * 5 +
    Number(boat.hull_damage || 0) / 2 -
    averageTrust / 3;
  if (score >= 90) return PHASE_TAGS[3];
  if (score >= 65) return PHASE_TAGS[2];
  if (score >= 40) return PHASE_TAGS[1];
  return PHASE_TAGS[0];
}

function dominantTopic(boat, averageFear, averageTrust) {
  if (boat.water <= 1) return "water";
  if (boat.food <= 1) return "food";
  if (boat.water_ingress >= 3 || boat.hull_damage >= 35) return "damage";
  if (averageTrust <= 35) return "suspicion";
  if (averageFear >= 70) return "fear";
  return "waiting";
}

function characterState(character) {
  if (character.target_pressure >= 12) return "accused";
  if (character.fear >= 80) return "panicking";
  if (character.trust <= 30) return "withdrawn";
  if (character.morality >= 75) return "protective";
  return "watching";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
