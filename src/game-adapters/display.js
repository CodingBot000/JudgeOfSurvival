import { COMMON_TRANSLATIONS, LANGUAGE_CODES } from "../content/localization.js";
import { deriveDialogueSignals } from "../scenarios/lifeboat-of-greed/dialogueSignals.js";
import { renderNarrativeLog } from "../survival-core/narrative/narrative-engine.js";
import { isNarrativeLogEntry } from "../survival-core/narrative/semantic-log.js";
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
  const scenario = resolveScenarioForTranslation(stateOrLanguage);
  return translateWithScenario(language, scenario, textKey, params);
}

export function getLanguageOptions(state) {
  return LANGUAGE_CODES.map((code) => ({
    code,
    label: translate(state, `language.${code}`),
  }));
}

export function formatLogEntry(state, entry, scenario = getScenario(state.scenarioId)) {
  if (isNarrativeLogEntry(entry)) {
    const scenarioTranslate = (stateOrLanguage, textKey, params = {}) => {
      const language =
        typeof stateOrLanguage === "string"
          ? stateOrLanguage
          : stateOrLanguage?.language || state.language || "ko";
      return translateWithScenario(language, scenario, textKey, params);
    };
    const rendered = renderNarrativeLog(state, scenario, entry, {
      language: state.language,
      translate: scenarioTranslate,
    });
    if (rendered) {
      return rendered;
    }
  }
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
      "Lifeboat visual positions use normalized x/y in the left-to-right, top-to-bottom scene viewport.",
    screen,
    language: state.language,
    boat: { ...state.boat },
    simulation: state.simulation ? { ...state.simulation } : null,
    cards: renderCardState(state, scenario),
    dialogue_signals: deriveDialogueSignals(state),
    boat_deltas: state.boatStatDeltas || {},
    alive_count: scenario.rules.aliveCount(state),
    controls: {
      minor_powers_enabled: scenario.rules.canUseMinorPower(state),
      major_powers_enabled: scenario.rules.canUseMajorPower(state),
      cards_enabled: !state.simulation?.isPaused && !scenario.rules.isJudgementDone(state),
      next_turn_enabled: !scenario.rules.isJudgementDone(state),
      finish_enabled: !scenario.rules.isJudgementDone(state),
    },
    character_deltas: state.characterStatDeltas || {},
    characters: visibleCharacters,
    recent_logs: state.logs
      .slice(-6)
      .map((entry) => formatLogEntry(state, entry, scenario)),
    recent_log_debug: state.logs.slice(-6).map((entry) => ({
      id: entry.id || entry.key,
      type: entry.type || "legacy",
      eventId: entry.eventId || "",
      storyletId: entry.storyletId || "",
      templateId: entry.templateId || "",
      actorId: entry.actorId || "",
      targetId: entry.targetId || "",
    })),
  });
}

function renderCardState(state, scenario) {
  const cards = state.cards || {};
  const byId = scenario.cards?.byId || {};
  return {
    hand: (cards.hand || []).map((cardId) => {
      const definition = byId[cardId] || {};
      return {
        id: cardId,
        sourcePowerId: definition.sourcePowerId || "",
        tier: definition.tier || "",
        rarity: definition.rarity || "",
        label: definition.labelKey ? translate(state, definition.labelKey) : cardId,
        description: definition.descriptionKey
          ? translate(state, definition.descriptionKey)
          : "",
        targetPolicy: definition.targetPolicy || "",
      };
    }),
    draw_count: cards.drawPile?.length || 0,
    discard_count: cards.discardPile?.length || 0,
    exhaust_count: cards.exhaustPile?.length || 0,
    next_draw_at_seconds: cards.nextDrawAtSeconds || 0,
    cards_played: cards.cardsPlayed || 0,
    last_played_card_id: cards.lastPlayedCardId || null,
  };
}

function resolveScenarioForTranslation(stateOrLanguage) {
  try {
    if (typeof stateOrLanguage === "object" && stateOrLanguage?.scenarioId) {
      return getScenario(stateOrLanguage.scenarioId);
    }
    return getScenario();
  } catch {
    return null;
  }
}

function translateWithScenario(language, scenario, textKey, params = {}) {
  const primaryScenario = scenario?.localization?.[language] || {};
  const primaryCommon = COMMON_TRANSLATIONS[language] || COMMON_TRANSLATIONS.ko || {};
  const fallbackScenario = scenario?.localization?.en || {};
  const fallbackCommon = COMMON_TRANSLATIONS.en || {};
  const template =
    primaryScenario[textKey] ||
    primaryCommon[textKey] ||
    fallbackScenario[textKey] ||
    fallbackCommon[textKey] ||
    textKey;
  return applyParams(language, scenario, template, params);
}

function applyParams(language, scenario, template, params) {
  let result = template;
  for (const [rawKey, rawValue] of Object.entries(params || {})) {
    const key = rawKey.endsWith("_key") ? rawKey.slice(0, -4) : rawKey;
    const value = rawKey.endsWith("_key")
      ? translateWithScenario(language, scenario, String(rawValue))
      : String(rawValue);
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function lifeboatPositionForIndex(index) {
  const positions = [
    { x: 0.3, y: 0.42 },
    { x: 0.47, y: 0.33 },
    { x: 0.64, y: 0.43 },
    { x: 0.38, y: 0.62 },
    { x: 0.55, y: 0.61 },
    { x: 0.72, y: 0.62 },
  ];
  return positions[index] || { x: 0.5, y: 0.5 };
}
