import assert from "node:assert/strict";
import {
  createInitialState,
  formatLogEntry,
  nextTurn,
  requestFinishChapter,
  setLanguage,
  translate,
  useMajorPower,
  useMinorPower,
} from "../src/game/logic.js";

let state = createInitialState();

assert.equal(state.characters.length, 6);
assert.equal(state.boat.water, 5);
assert.equal(state.boat.minor_power, 3);
assert.equal(state.boat.max_minor_power, 3);
assert.equal(state.boat.major_power, 4);
assert.equal(translate(state, "ui.title.chapter_1"), "1장 - 탐욕의 구명보트");
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("심판이 시작됩니다"));

state = setLanguage(state, "en");
assert.equal(translate(state, "ui.title.chapter_1"), "Chapter 1 - Lifeboat of Greed");
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("The trial begins"));
state = setLanguage(state, "ko");

state = useMajorPower(state, "reduce_water");
assert.equal(state.boat.water, 4);
assert.equal(state.boat.major_power, 3);
assert.equal(state.characterStatDeltas.chairman.fear, 8);

state = useMajorPower(state, "hidden_food");
assert.equal(state.boat.major_power, 2);
assert.equal(state.characters.find((character) => character.id === "chairman").has_hidden_resource, true);
assert.equal(state.characterStatDeltas.chairman.greed, 10);
assert.equal(state.characterStatDeltas.chairman.fear, undefined);

state = useMinorPower(state, "false_comfort");
assert.equal(state.boat.minor_power, 2);
assert.equal(state.boat.rescue_chance, 27);
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

state = nextTurn(state);
assert.equal(state.boat.minor_power, 1);
assert.equal(state.boat.major_power, 0);

state = requestFinishChapter(state);
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("아직 최후의 판정"));

let guard = 0;
while (!state.boat.judgement_done && guard < 12) {
  state = nextTurn(state);
  guard += 1;
}

assert.equal(state.boat.judgement_done, true);
assert.ok(state.characters.every((character) => character.judgement));

console.log("Logic smoke test passed.");
