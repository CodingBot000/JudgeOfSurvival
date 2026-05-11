import { voiceProfiles } from "./voice-profiles.js";

const PHASES = ["discomfort", "scarcity", "fracture", "collapse"];

export function buildLifeboatNarrativeContext(state, entry, tools = {}) {
  const actor = findCharacter(state, entry.actorId);
  const target = findCharacter(state, entry.targetId);
  const phase = phaseFromEntry(entry) || phaseForTurn(state.boat?.turn || entry.turn || 1);
  const dominantRisk = dominantRiskForBoat(state.boat || {});
  const targetKind = targetKindFor(target);
  const choose = tools.choose || ((items) => items?.[0]);
  const lexicon = tools.lexicon || {};
  const actorVoice = voiceProfiles[entry.actorId] || {};

  const context = {
    language: tools.language || state.language || "ko",
    eventId: entry.eventId,
    intent: entry.intent,
    actorId: entry.actorId,
    targetId: entry.targetId,
    actor,
    target,
    phase,
    tags: [...new Set([...(entry.tags || []), phase, dominantRisk, targetKind])],
    voiceTags: actorVoice.voiceTags || [],
    environment: state.boat || {},
    variantSeed: entry.variantSeed,
    tokens: {
      ...(entry.params || {}),
      actorName: actor ? characterName(actor, tools) : entry.params?.actor || "",
      targetName: target ? characterName(target, tools) : entry.params?.target || "",
      actorRole: actor ? characterRole(actor, tools) : "",
      targetRole: target ? characterRole(target, tools) : "",
      targetLabel: chooseLexicon(lexicon, "targetLabel", targetKind, choose, "targetLabel"),
      riskNoun: chooseLexicon(lexicon, "riskNoun", dominantRisk, choose, "riskNoun"),
      groupName: chooseFlatLexicon(lexicon, "groupName", choose, "groupName"),
      opener: chooseLexicon(
        lexicon,
        "opener",
        entry.actorId || "default",
        choose,
        "opener",
      ),
      gesture: chooseFlatLexicon(lexicon, "gesture", choose, "gesture"),
      silence: chooseFlatLexicon(lexicon, "silence", choose, "silence"),
      damageSound: chooseFlatLexicon(lexicon, "damageSound", choose, "damageSound"),
      waterMotion: chooseFlatLexicon(lexicon, "waterMotion", choose, "waterMotion"),
      turn: state.boat?.turn ?? entry.turn ?? 0,
      water: state.boat?.water ?? 0,
      food: state.boat?.food ?? 0,
      stability: state.boat?.stability ?? 0,
      hullDamage: state.boat?.hull_damage ?? 0,
      waterIngress: state.boat?.water_ingress ?? 0,
      loadPressure: state.boat?.load_pressure ?? 0,
      despair: state.boat?.despair ?? 0,
    },
  };

  return context;
}

export function resolveLifeboatToken(token, context) {
  if (Object.hasOwn(context.tokens || {}, token)) {
    return context.tokens[token];
  }
  return undefined;
}

function findCharacter(state, id) {
  if (!id) {
    return null;
  }
  return state.characters?.find((character) => character.id === id) || null;
}

function characterName(character, tools) {
  if (tools.translate && character.name_key) {
    return tools.translate(tools.language, character.name_key);
  }
  return character.name || character.id;
}

function characterRole(character, tools) {
  if (tools.translate && character.role_key) {
    return tools.translate(tools.language, character.role_key);
  }
  return character.role || "";
}

function phaseFromEntry(entry) {
  return entry.tags?.find((tag) => PHASES.includes(tag));
}

function phaseForTurn(turn) {
  if (turn <= 4) return "discomfort";
  if (turn <= 8) return "scarcity";
  if (turn <= 14) return "fracture";
  return "collapse";
}

function dominantRiskForBoat(boat) {
  if (boat.water <= 1) return "water";
  if (boat.food <= 1) return "food";
  if (boat.water_ingress >= 3) return "ingress";
  if (boat.hull_damage >= 35 || boat.stability <= 35) return "damage";
  if (boat.storm_level >= 2) return "storm";
  if (boat.load_pressure >= 34) return "load";
  if (boat.despair >= 7) return "despair";
  return "default";
}

function targetKindFor(target) {
  if (!target) return "default";
  if (target.health <= 45) return "weak";
  if (target.greed >= 70 || target.has_hidden_resource) return "greedy";
  if (target.trust <= 35 || target.accusation_score >= 10) return "distrusted";
  if (target.influence >= 70) return "influential";
  return "default";
}

function chooseLexicon(lexicon, group, key, choose, salt) {
  const groupValue = lexicon[group];
  const values = groupValue?.[key] || groupValue?.default || [];
  return choose(values, `${salt}:${key}`) || "";
}

function chooseFlatLexicon(lexicon, group, choose, salt) {
  return choose(lexicon[group] || [], salt) || "";
}
