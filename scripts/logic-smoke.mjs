import assert from "node:assert/strict";
import {
  COMMAND_TYPES,
  applyCommand,
  createInitialState,
} from "../src/survival-core/engine.js";
import {
  formatLogEntry,
  setLanguage,
  translate,
} from "../src/game-adapters/display.js";
import { getScenario } from "../src/game-adapters/scenario-registry.js";

const scenario = getScenario();
const { getBoatDelta, getCharacterDelta } = scenario.rules;
const nextTurn = (current) =>
  applyCommand(current, scenario, { type: COMMAND_TYPES.NEXT_TURN });
const requestFinishChapter = (current) =>
  applyCommand(current, scenario, { type: COMMAND_TYPES.FINISH_CHAPTER });
const useMajorPower = (current, powerId) =>
  applyCommand(current, scenario, {
    type: COMMAND_TYPES.USE_MAJOR_POWER,
    powerId,
  });
const useMinorPower = (current, powerId) =>
  applyCommand(current, scenario, {
    type: COMMAND_TYPES.USE_MINOR_POWER,
    powerId,
  });

let state = createInitialState(scenario);

assert.equal(state.characters.length, 6);
assert.equal(state.scenarioId, "lifeboat-of-greed");
assert.equal(state.schemaVersion, 1);
assert.equal(state.boat.max_turn, 18);
assert.equal(state.boat.water, 5);
assert.equal(state.boat.load_pressure, 32);
assert.equal(state.boat.hull_damage, 0);
assert.equal(state.boat.water_ingress, 0);
assert.equal(state.boat.despair, 0);
assert.equal(state.boat.minor_power, 3);
assert.equal(state.boat.max_minor_power, 3);
assert.equal(state.boat.major_power, 4);
assert.ok(state.characters.every((character) => Array.isArray(character.alliances)));
assert.ok(state.characters.every((character) => Array.isArray(character.enemies)));
assert.ok(state.characters.every((character) => Number.isFinite(character.target_pressure)));
assert.equal(translate(state, "ui.title.chapter_1"), "1장 - 탐욕의 구명보트");
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("심판이 시작됩니다"));

state = setLanguage(state, "en");
assert.equal(translate(state, "ui.title.chapter_1"), "Chapter 1 - Lifeboat of Greed");
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("The trial begins"));
state = setLanguage(state, "ko");

state = useMajorPower(state, "reduce_water");
assert.equal(state.boat.water, 4);
assert.equal(state.boat.major_power, 3);
assert.equal(getBoatDelta(state, "water"), -1);
assert.equal(getBoatDelta(state, "major_power"), -1);
assert.equal(getBoatDelta(state, "despair"), 1);
assert.equal(state.characterStatDeltas.chairman.fear, 8);
assert.equal(getCharacterDelta(state, "chairman", "fear"), 8);
assert.equal(getCharacterDelta(state, "chairman", "target_pressure"), 4);

state = useMajorPower(state, "hidden_food");
assert.equal(state.boat.major_power, 2);
assert.equal(state.characters.find((character) => character.id === "chairman").has_hidden_resource, true);
assert.equal(getBoatDelta(state, "major_power"), -1);
assert.equal(state.characterStatDeltas.chairman.greed, 10);
assert.equal(state.characterStatDeltas.chairman.fear, undefined);
assert.equal(getCharacterDelta(state, "chairman", "hypocrisy_count"), 1);
assert.equal(getCharacterDelta(state, "chairman", "accusation_score"), 6);

state = useMinorPower(state, "false_comfort");
assert.equal(state.boat.minor_power, 2);
assert.equal(state.boat.rescue_chance, 27);
assert.equal(getBoatDelta(state, "minor_power"), -1);
assert.equal(getBoatDelta(state, "rescue_chance"), -3);
assert.equal(state.characterStatDeltas.chairman.fear, -3);
assert.equal(state.characterStatDeltas.chairman.trust, 1);

state = useMinorPower(state, "heavy_silence");
state = useMinorPower(state, "seed_doubt");
assert.equal(state.boat.minor_power, 0);

state = useMinorPower(state, "whisper_fear");
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("약한 권능이 남아 있지 않습니다"));

state = useMajorPower(state, "storm");
state = useMajorPower(state, "rumor");
assert.equal(state.boat.major_power, 0);

state = useMajorPower(state, "reduce_water");
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("강한 권능이 남아 있지 않습니다"));
assert.equal(Object.keys(state.boatStatDeltas).length, 0);
assert.equal(Object.keys(state.characterStatDeltas).length, 0);

const healthBeforeTurn = Object.fromEntries(
  state.characters.map((character) => [character.id, character.health]),
);
state = nextTurn(state);
assert.equal(state.boat.minor_power, 1);
assert.equal(state.boat.major_power, 0);
assert.equal(getBoatDelta(state, "turn"), 1);
assert.equal(getBoatDelta(state, "minor_power"), 1);
assert.ok(state.boat.turn > 1);
assert.ok(state.boat.hull_damage > 0);
assert.ok(state.boat.despair > 0);
assert.ok(getBoatDelta(state, "hull_damage") > 0);
assert.ok(getBoatDelta(state, "despair") > 0);
assert.ok(state.boat.event_history.length > 0);
assert.ok(
  state.characters.every((character) => character.health < healthBeforeTurn[character.id]),
);

state = requestFinishChapter(state);
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("아직 최후의 판정"));

let guard = 0;
while (!state.boat.judgement_done && guard < 25) {
  state = nextTurn(state);
  guard += 1;
}

assert.equal(state.boat.judgement_done, true);
assert.ok(state.characters.every((character) => character.judgement));
assert.ok(state.boat.turn > state.boat.max_turn || state.characters.filter((character) => character.alive).length <= 2);
assert.ok(state.characters.some((character) => !character.alive));
assert.ok(new Set(state.boat.event_history.map((entry) => entry.id)).size >= 4);
for (let index = 1; index < state.boat.event_history.length; index += 1) {
  assert.notEqual(
    state.boat.event_history[index].id,
    state.boat.event_history[index - 1].id,
  );
}

console.log("Logic smoke test passed.");
