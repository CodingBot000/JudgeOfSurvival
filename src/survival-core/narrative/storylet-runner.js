import { ensureNarrativeMemoryMut, memoryPenalty } from "./repetition-memory.js";
import { weightedPickFromSeed } from "./seeded-choice.js";

export function selectNarrativeVariant(state, narrative, context) {
  const memory = ensureNarrativeMemoryMut(state);
  const storylets = narrative?.storylets || [];
  const storyletCandidates = storylets
    .filter((storylet) => matchesStorylet(storylet, context))
    .map((storylet) => ({
      value: storylet,
      weight: scoreStorylet(storylet, context, memory),
    }));

  const storylet =
    weightedPickFromSeed(storyletCandidates, context.variantSeed, "storylet") ||
    storylets.find((candidate) => candidate.id === narrative?.fallbackStoryletId) ||
    storylets[0];

  if (!storylet) {
    return { storyletId: "", templateId: "" };
  }

  const templateCandidates = (storylet.templateIds || []).map((templateId) => ({
    value: templateId,
    weight: Math.max(
      1,
      10 - memoryPenalty(memory, "recentTemplateIds", templateId, 8),
    ),
  }));

  const templateId =
    weightedPickFromSeed(templateCandidates, context.variantSeed, "template") ||
    storylet.templateIds?.[0] ||
    "";

  return { storyletId: storylet.id, templateId };
}

function matchesStorylet(storylet, context) {
  if (storylet.eventIds?.length && !storylet.eventIds.includes(context.eventId)) {
    return false;
  }
  if (storylet.intents?.length && !storylet.intents.includes(context.intent)) {
    return false;
  }
  if (storylet.phases?.length && !storylet.phases.includes(context.phase)) {
    return false;
  }
  if (storylet.requireTags?.length) {
    const tags = new Set(context.tags || []);
    if (!storylet.requireTags.every((tag) => tags.has(tag))) {
      return false;
    }
  }
  return storylet.canUse ? storylet.canUse(context) : true;
}

function scoreStorylet(storylet, context, memory) {
  const tags = new Set(context.tags || []);
  const voiceTags = new Set(context.voiceTags || []);
  const tagBonus = (storylet.tags || []).filter((tag) => tags.has(tag)).length * 2;
  const voiceBonus = (storylet.voiceTags || []).filter((tag) =>
    voiceTags.has(tag),
  ).length * 3;
  const repeatPenalty =
    memoryPenalty(memory, "recentStoryletIds", storylet.id, 7) +
    memoryPenalty(memory, "recentSpeakerIds", context.actorId, 3) +
    memoryPenalty(memory, "recentIntentIds", context.intent, 2);

  return Math.max(1, (storylet.baseWeight || 1) + tagBonus + voiceBonus - repeatPenalty);
}
