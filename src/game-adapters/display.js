import { LANGUAGE_CODES, TRANSLATIONS } from "../content/localization.js";
import { getScenario } from "./scenario-registry.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

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

export function characterName(state, character) {
  return translate(state, character.name_key || character.name || "Unknown");
}

export function characterRole(state, character) {
  return translate(state, character.role_key || character.role || "Unknown");
}

export function characterJudgement(state, character) {
  return translate(state, character.judgement || "judgement.unjudged");
}

export function renderGameToText(state, screen = "trial", scenario = getScenario(state.scenarioId)) {
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
    alliances: character.alliances || [],
    enemies: character.enemies || [],
    accusation_score: character.accusation_score || 0,
    target_pressure: character.target_pressure || 0,
    death_reason: character.death_reason || "",
    judgement: character.judgement ? characterJudgement(state, character) : "",
  }));

  return JSON.stringify({
    coordinate_system:
      "Lifeboat visual positions use normalized x/y in a left-to-right, top-to-bottom SVG viewport.",
    screen,
    language: state.language,
    boat: { ...state.boat },
    boat_deltas: state.boatStatDeltas || {},
    alive_count: scenario.rules.aliveCount(state),
    controls: {
      minor_powers_enabled: scenario.rules.canUseMinorPower(state),
      major_powers_enabled: scenario.rules.canUseMajorPower(state),
      next_turn_enabled: !scenario.rules.isJudgementDone(state),
      finish_enabled: !scenario.rules.isJudgementDone(state),
    },
    character_deltas: state.characterStatDeltas || {},
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
