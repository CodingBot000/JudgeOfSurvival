const MEMORY_LIMIT = 12;

export function createNarrativeMemory() {
  return {
    recentStoryletIds: [],
    recentTemplateIds: [],
    recentSpeakerIds: [],
    recentIntentIds: [],
  };
}

export function ensureNarrativeMemoryMut(state) {
  state.narrativeMemory ||= createNarrativeMemory();
  state.narrativeMemory.recentStoryletIds ||= [];
  state.narrativeMemory.recentTemplateIds ||= [];
  state.narrativeMemory.recentSpeakerIds ||= [];
  state.narrativeMemory.recentIntentIds ||= [];
  return state.narrativeMemory;
}

export function rememberNarrativeVariantMut(state, entry) {
  const memory = ensureNarrativeMemoryMut(state);
  remember(memory.recentStoryletIds, entry.storyletId);
  remember(memory.recentTemplateIds, entry.templateId);
  remember(memory.recentSpeakerIds, entry.actorId);
  remember(memory.recentIntentIds, entry.intent);
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

function remember(list, value) {
  if (!value) {
    return;
  }
  list.push(value);
  if (list.length > MEMORY_LIMIT) {
    list.splice(0, list.length - MEMORY_LIMIT);
  }
}
