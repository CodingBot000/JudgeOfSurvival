export const SPEECH_BUBBLE_DURATION_MS = 4000;
export const SPEECH_BUBBLE_CHARACTER_COOLDOWN_MS = 3000;
export const SPEECH_BUBBLE_MAX_ACTIVE = 3;

export function createSpeechBubbleState() {
  return {
    activeCount: 0,
    items: [],
    lastSpokenAtByCharacter: {},
    recentLineIds: [],
  };
}

export function advanceSpeechBubbles({
  state,
  game,
  scenario,
  nowMs,
  anchors,
  visibleCharacterIds,
  blocked = false,
  force = false,
  seedSalt = "",
}) {
  const current = expireSpeechBubbles(state || createSpeechBubbleState(), nowMs);

  if (blocked || current.activeCount >= SPEECH_BUBBLE_MAX_ACTIVE || !game || !scenario?.dialogue) {
    return current;
  }

  const signals = scenario.rules?.deriveDialogueSignals
    ? scenario.rules.deriveDialogueSignals(game)
    : scenario.dialogueSignals?.deriveDialogueSignals?.(game);
  const dialogueSignals = signals || scenario.dialogue.deriveDialogueSignals?.(game);
  const globalSignals = dialogueSignals?.global || {};

  if (!force && globalSignals.shouldSurfaceDialogue === false) {
    return current;
  }

  const visibleSet = new Set(visibleCharacterIds || []);
  const visibleAlive = (game.characters || []).filter(
    (character) =>
      character.alive &&
      visibleSet.has(character.id) &&
      anchors?.[character.id],
  );

  if (visibleAlive.length === 0) {
    return current;
  }

  const preferred = pickPreferredSpeaker(visibleAlive, dialogueSignals, game, nowMs, seedSalt);
  const speaker = canCharacterSpeak(preferred, current, nowMs) &&
    canPlaceBubble(preferred, current, anchors)
    ? preferred
    : pickAlternateSpeaker(visibleAlive, preferred?.id, current, dialogueSignals, nowMs, anchors);

  if (!speaker) {
    return current;
  }

  const recentLineIds = current.recentLineIds || [];
  const selectedLine = scenario.dialogue.selectDialogueLine({
    state: game,
    character: speaker,
    language: game.language,
    signals: dialogueSignals,
    recentLineIds,
    seedSalt: `${seedSalt}:${nowMs}:${current.items.length}`,
  });

  if (!selectedLine) {
    return current;
  }

  const item = {
    id: `speech-${Math.round(nowMs)}-${speaker.id}-${selectedLine.id}`,
    characterId: speaker.id,
    lineId: selectedLine.id,
    text: selectedLine.text,
    anchor: normalizeAnchor(anchors[speaker.id]),
    startedAtMs: nowMs,
    expiresAtMs: nowMs + SPEECH_BUBBLE_DURATION_MS,
  };

  const items = [...current.items, item].slice(-SPEECH_BUBBLE_MAX_ACTIVE);
  return {
    ...current,
    activeCount: items.length,
    items,
    lastSpokenAtByCharacter: {
      ...current.lastSpokenAtByCharacter,
      [speaker.id]: nowMs,
    },
    recentLineIds: [selectedLine.id, ...recentLineIds.filter((id) => id !== selectedLine.id)].slice(0, 12),
  };
}

export function expireSpeechBubbles(state, nowMs) {
  const current = state || createSpeechBubbleState();
  const items = (current.items || []).filter((item) => item.expiresAtMs > nowMs);
  return {
    ...current,
    activeCount: items.length,
    items,
  };
}

export function summarizeSpeechBubbles(state, nowMs = 0) {
  const current = state || createSpeechBubbleState();
  return {
    active_count: current.activeCount || 0,
    items: (current.items || []).map((item) => ({
      characterId: item.characterId,
      lineId: item.lineId,
      text: item.text,
      remaining_ms: nowMs ? Math.max(0, Math.round(item.expiresAtMs - nowMs)) : null,
    })),
  };
}

function pickPreferredSpeaker(characters, signals, game, nowMs, seedSalt) {
  const weighted = characters.map((character, index) => ({
    value: character,
    weight: speakerWeight(character, signals, index),
  }));
  return scenarioWeightedPick(weighted, `${game.rngSeed}:${game.simulation?.blockIndex || 0}`, `${seedSalt}:${nowMs}`);
}

function pickAlternateSpeaker(characters, rejectedCharacterId, state, signals, nowMs, anchors) {
  return characters
    .filter(
      (character) =>
        character.id !== rejectedCharacterId &&
        canCharacterSpeak(character, state, nowMs) &&
        canPlaceBubble(character, state, anchors),
    )
    .sort((a, b) => speakerWeight(b, signals, 0) - speakerWeight(a, signals, 0))[0] || null;
}

function canPlaceBubble(character, state, anchors) {
  const anchor = anchors?.[character?.id];
  if (!anchor) {
    return false;
  }
  return !(state.items || []).some((item) => {
    const existing = item.anchor || {};
    return (
      Math.abs(Number(anchor.left || 0) - Number(existing.left || 0)) < 18 &&
      Math.abs(Number(anchor.top || 0) - Number(existing.top || 0)) < 22
    );
  });
}

function canCharacterSpeak(character, state, nowMs) {
  if (!character) {
    return false;
  }
  const lastSpokenAt = state.lastSpokenAtByCharacter?.[character.id];
  return (
    typeof lastSpokenAt !== "number" ||
    nowMs - lastSpokenAt >= SPEECH_BUBBLE_CHARACTER_COOLDOWN_MS
  );
}

function speakerWeight(character, signals, index) {
  const urgency = signals?.characters?.[character.id]?.urgency || 0;
  return 8 + urgency / 18 + (index % 3);
}

function normalizeAnchor(anchor) {
  const left = clamp(Number(anchor?.left || 50), 13, 87);
  const top = clamp(Number(anchor?.top || 50), 18, 82);
  return { left, top };
}

function scenarioWeightedPick(weightedItems, seed, salt) {
  const candidates = weightedItems.filter((item) => item.weight > 0);
  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  let cursor = seededNumber(`${seed}:${salt}`) * totalWeight;
  for (const item of candidates) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.value;
    }
  }
  return candidates.at(-1)?.value || null;
}

function seededNumber(value) {
  let hash = 2166136261;
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash << 13;
  hash ^= hash >>> 17;
  hash ^= hash << 5;
  return (hash >>> 0) / 4294967296;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
