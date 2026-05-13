import assert from "node:assert/strict";
import { createInitialState } from "../src/survival-core/engine.js";
import { renderGameToText } from "../src/game-adapters/display.js";
import { getScenario } from "../src/game-adapters/scenario-registry.js";
import { deriveDialogueSignals } from "../src/scenarios/lifeboat-of-greed/dialogueSignals.js";

const scenario = getScenario();
const state = createInitialState(scenario);
const signals = deriveDialogueSignals(state);

assert.ok(signals.global);
assert.equal(Object.keys(signals.characters).length, state.characters.length);
assert.ok(signals.global.dominantTopic);

const snapshot = JSON.parse(renderGameToText(state, "trial", scenario));
assert.ok(snapshot.dialogue_signals.global);
assert.equal(Object.keys(snapshot.dialogue_signals.characters).length, state.characters.length);

console.log("Dialogue signals smoke test passed.");
