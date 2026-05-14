import assert from "node:assert/strict";
import { createInitialState } from "../src/survival-core/engine.js";
import { getScenario } from "../src/game-adapters/scenario-registry.js";
import {
  DIALOGUE_SET_KEYS,
  dialogueLineIdsForLanguage,
  dialogueLineSets,
  resolveDialogueText,
  selectDialogueLine,
} from "../src/scenarios/lifeboat-of-greed/dialogue/index.js";
import {
  SPEECH_BUBBLE_CHARACTER_COOLDOWN_MS,
  SPEECH_BUBBLE_DURATION_MS,
  SPEECH_BUBBLE_MAX_ACTIVE,
  advanceSpeechBubbles,
  createSpeechBubbleState,
} from "../src/ui/speech-bubbles/speech-bubble-scheduler.js";

const scenario = getScenario();
const state = createInitialState(scenario);
const anchors = Object.fromEntries(
  state.characters.map((character, index) => [
    character.id,
    { left: 16 + index * 13, top: index % 2 === 0 ? 34 : 66 },
  ]),
);
const visibleCharacterIds = state.characters.map((character) => character.id);
const allowedSetKeys = new Set(DIALOGUE_SET_KEYS);
const characterIds = new Set(state.characters.map((character) => character.id));
const koLineIds = new Set(dialogueLineIdsForLanguage("ko"));
const enLineIds = new Set(dialogueLineIdsForLanguage("en"));

for (const line of dialogueLineSets) {
  assert.ok(characterIds.has(line.characterId), `${line.id} has invalid characterId`);
  assert.ok(koLineIds.has(line.id), `${line.id} is missing in ko lines`);
  assert.ok(enLineIds.has(line.id), `${line.id} is missing in en lines`);
  for (const setKey of line.setKeys) {
    assert.ok(allowedSetKeys.has(setKey), `${line.id} has invalid setKey ${setKey}`);
  }
}

for (const lineId of koLineIds) {
  assert.ok(enLineIds.has(lineId), `${lineId} is missing in en lines`);
}

const firstCharacter = state.characters[0];
const selectedKo = selectDialogueLine({
  state,
  character: firstCharacter,
  language: "ko",
  seedSalt: "smoke-ko",
});
const selectedEn = selectDialogueLine({
  state,
  character: firstCharacter,
  language: "en",
  seedSalt: "smoke-en",
});

assert.equal(typeof selectedKo.text, "string");
assert.ok(selectedKo.text.length > 0);
assert.equal(typeof selectedEn.text, "string");
assert.ok(selectedEn.text.length > 0);
assert.equal(resolveDialogueText("missing-language", selectedKo.id), selectedKo.text);

let bubbles = createSpeechBubbleState();
bubbles = advanceSpeechBubbles({
  state: bubbles,
  game: state,
  scenario,
  nowMs: 1000,
  anchors,
  visibleCharacterIds,
  force: true,
  seedSalt: "first",
});
assert.equal(bubbles.items.length, 1);

const firstSpeaker = bubbles.items[0].characterId;
bubbles = advanceSpeechBubbles({
  state: bubbles,
  game: state,
  scenario,
  nowMs: 1000 + SPEECH_BUBBLE_CHARACTER_COOLDOWN_MS - 1,
  anchors,
  visibleCharacterIds,
  force: true,
  seedSalt: "second",
});
assert.equal(bubbles.items.length, 2);
assert.notEqual(
  bubbles.items[1].characterId,
  firstSpeaker,
  "scheduler should switch away from a speaker still on cooldown",
);

bubbles = advanceSpeechBubbles({
  state: bubbles,
  game: state,
  scenario,
  nowMs: 2200,
  anchors,
  visibleCharacterIds,
  force: true,
  seedSalt: "third",
});
assert.ok(bubbles.items.length <= SPEECH_BUBBLE_MAX_ACTIVE);

const filled = {
  ...bubbles,
  items: [
    ...bubbles.items,
    {
      id: "manual-fill",
      characterId: "manual",
      lineId: "manual",
      text: "manual",
      anchor: { left: 50, top: 50 },
      startedAtMs: 2200,
      expiresAtMs: 6200,
    },
  ].slice(0, SPEECH_BUBBLE_MAX_ACTIVE),
};
filled.activeCount = filled.items.length;
const afterLimitAttempt = advanceSpeechBubbles({
  state: filled,
  game: state,
  scenario,
  nowMs: 2300,
  anchors,
  visibleCharacterIds,
  force: true,
  seedSalt: "limit",
});
assert.equal(afterLimitAttempt.items.length, SPEECH_BUBBLE_MAX_ACTIVE);

const expired = advanceSpeechBubbles({
  state: bubbles,
  game: state,
  scenario,
  nowMs: 1000 + SPEECH_BUBBLE_DURATION_MS + 1,
  anchors,
  visibleCharacterIds: [],
  blocked: true,
});
assert.equal(expired.items.some((item) => item.characterId === firstSpeaker), false);

console.log("Speech bubble smoke test passed.");
