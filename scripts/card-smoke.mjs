import assert from "node:assert/strict";
import {
  COMMAND_TYPES,
  applyCommand,
  createInitialState,
} from "../src/survival-core/engine.js";
import { getScenario } from "../src/game-adapters/scenario-registry.js";

const scenario = getScenario();
let state = createInitialState(scenario);

assert.equal(state.cards.hand.length, 3);
assert.equal(state.cards.maxHandSize, 4);

const firstCardId = state.cards.hand[0];
state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.PLAY_CARD,
  cardId: firstCardId,
});

assert.equal(state.cards.cardsPlayed, 1);
assert.equal(state.cards.lastPlayedCardId, firstCardId);
assert.equal(state.cards.hand.includes(firstCardId), false);
assert.ok(state.cards.discardPile.includes(firstCardId));
assert.ok(state.logs.some((entry) => entry.type === "narrative"));

state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.ADVANCE_TIME,
  deltaSeconds: 90,
  ignorePause: true,
  useTimeScale: false,
});
assert.ok(state.cards.hand.length <= state.cards.maxHandSize);

state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.SET_PAUSED,
  isPaused: true,
});
const pausedCardId = state.cards.hand[0];
const handBeforePausedPlay = [...state.cards.hand];
state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.PLAY_CARD,
  cardId: pausedCardId,
});
assert.deepEqual(state.cards.hand, handBeforePausedPlay);
assert.equal(state.logs.at(-1).key, "log.card_paused");

console.log("Card smoke test passed.");
