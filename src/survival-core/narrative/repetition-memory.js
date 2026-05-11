import { hashString, weightedPickFromSeed } from "./seeded-choice.js";

const MEMORY_LIMIT = 12;

export function createNarrativeMemory() {
  return {
    recentStoryletIds: [],
    recentTemplateIds: [],
    recentSpeakerIds: [],
    recentIntentIds: [],
    recentPhraseIds: [],
  };
}

export function ensureNarrativeMemoryMut(state) {
  state.narrativeMemory ||= createNarrativeMemory();
  state.narrativeMemory.recentStoryletIds ||= [];
  state.narrativeMemory.recentTemplateIds ||= [];
  state.narrativeMemory.recentSpeakerIds ||= [];
  state.narrativeMemory.recentIntentIds ||= [];
  state.narrativeMemory.recentPhraseIds ||= [];
  return state.narrativeMemory;
}

export function rememberNarrativeVariantMut(state, entry) {
  const memory = ensureNarrativeMemoryMut(state);
  remember(memory.recentStoryletIds, entry.storyletId);
  remember(memory.recentTemplateIds, entry.templateId);
  remember(memory.recentSpeakerIds, entry.actorId);
  remember(memory.recentIntentIds, entry.intent);
  for (const phraseId of entry.phraseIds || []) {
    remember(memory.recentPhraseIds, phraseId);
  }
}

export function memoryPenalty(memory, fieldName, value, penalty) {
  if (!value) {
    return 0;
  }
  const recentValues = memory?.[fieldName] || [];
  const latestIndex = recentValues.lastIndexOf(value);
  if (latestIndex < 0) {
    return 0;
  }
  const recency = recentValues.length - latestIndex;
  return Math.max(1, penalty - recency + 1);
}

export function pickPhraseWithMemory(items, seed, salt, memory) {
  const weightedItems = (items || []).map((rawItem) => {
    const index = items.indexOf(rawItem);
    const text = typeof rawItem === "string" ? rawItem : rawItem?.text || "";
    const id =
      typeof rawItem === "string"
        ? phraseIdFor(text)
        : rawItem?.id || phraseIdFor(text);
    return {
      value: { id, text, index },
      weight: Math.max(1, 10 - memoryPenalty(memory, "recentPhraseIds", id, 8)),
    };
  });

  return weightedPickFromSeed(weightedItems, seed, salt);
}

export function phraseIdFor(text) {
  return `phrase:${hashString(text).toString(36)}`;
}

function remember(list, value) {
  if (!value) {
    return;
  }
  list.push(value);
  if (list.length > MEMORY_LIMIT) {
    list.splice(0, list.length - MEMORY_LIMIT);
  }
}
