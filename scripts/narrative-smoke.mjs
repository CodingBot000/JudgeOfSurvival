import assert from "node:assert/strict";
import {
  COMMAND_TYPES,
  applyCommand,
  createInitialState,
} from "../src/survival-core/engine.js";
import {
  formatLogEntry,
  renderGameToText,
  setLanguage,
} from "../src/game-adapters/display.js";
import { getScenario } from "../src/game-adapters/scenario-registry.js";

const scenario = getScenario();

const commandList = [
  { type: COMMAND_TYPES.USE_MAJOR_POWER, powerId: "hidden_food" },
  { type: COMMAND_TYPES.USE_MAJOR_POWER, powerId: "reduce_water" },
  { type: COMMAND_TYPES.USE_MINOR_POWER, powerId: "whisper_fear" },
  { type: COMMAND_TYPES.NEXT_TURN },
  { type: COMMAND_TYPES.NEXT_TURN },
  { type: COMMAND_TYPES.NEXT_TURN },
  { type: COMMAND_TYPES.NEXT_TURN },
];

function runTranscript(seed, language = "ko") {
  let state = createInitialState(scenario, { seed, language });
  for (const command of commandList) {
    state = applyCommand(state, scenario, command);
  }
  return {
    state,
    rendered: state.logs.map((entry) => formatLogEntry(state, entry, scenario)),
  };
}

const first = runTranscript(10101);
const second = runTranscript(10101);
const otherSeed = runTranscript(20202);

assert.deepEqual(first.rendered, second.rendered);
assert.notDeepEqual(first.rendered, otherSeed.rendered);

const narrativeEntries = first.state.logs.filter((entry) => entry.type === "narrative");
assert.ok(narrativeEntries.length >= 4);
assert.ok(narrativeEntries.every((entry) => entry.storyletId));
assert.ok(narrativeEntries.every((entry) => entry.templateId));
assert.ok(narrativeEntries.every((entry) => Number.isFinite(entry.variantSeed)));
assert.ok(narrativeEntries.every((entry) => Array.isArray(entry.phraseIds)));
assert.ok(narrativeEntries.every((entry) => entry.phraseChoices));

const renderedNarratives = narrativeEntries.map((entry) =>
  formatLogEntry(first.state, entry, scenario),
);
assert.ok(renderedNarratives.every((line) => typeof line === "string" && line.length > 0));
assert.ok(renderedNarratives.some((line) => line.includes("베일")));
assert.ok(renderedNarratives.every((line) => !line.startsWith("event.")));

const englishState = setLanguage(first.state, "en");
const englishNarrative = formatLogEntry(
  englishState,
  narrativeEntries.find((entry) => entry.targetId),
  scenario,
);
assert.ok(englishNarrative.includes("Mr. Vale") || englishNarrative.includes("Clara") || englishNarrative.includes("Grant"));

const legacyLine = formatLogEntry(first.state, first.state.logs[0], scenario);
assert.ok(legacyLine.includes("심판이 시작됩니다"));

let finalState = createInitialState(scenario, { seed: 30303, language: "ko" });
let guard = 0;
while (!finalState.boat.judgement_done && guard < 30) {
  finalState = applyCommand(finalState, scenario, {
    type: COMMAND_TYPES.NEXT_TURN,
  });
  guard += 1;
}

assert.equal(finalState.boat.judgement_done, true);
const deathEntries = finalState.logs.filter((entry) => entry.eventId === "death");
const judgementEntries = finalState.logs.filter(
  (entry) => entry.eventId === "judgement_result",
);
assert.ok(deathEntries.length > 0);
assert.equal(judgementEntries.length, finalState.characters.length);
assert.ok(deathEntries.every((entry) => entry.type === "narrative"));
assert.ok(judgementEntries.every((entry) => entry.type === "narrative"));
assert.ok(judgementEntries.every((entry) => entry.storyletId && entry.templateId));

const renderedDeath = deathEntries.map((entry) =>
  formatLogEntry(finalState, entry, scenario),
);
const renderedJudgement = judgementEntries.map((entry) =>
  formatLogEntry(finalState, entry, scenario),
);
assert.ok(renderedDeath.every((line) => !line.includes("log.death")));
assert.ok(renderedJudgement.every((line) => !/judgement\.[a-z_]+/.test(line)));

const finalEnglish = setLanguage(finalState, "en");
const englishJudgement = formatLogEntry(finalEnglish, judgementEntries[0], scenario);
assert.ok(!/judgement\.[a-z_]+/.test(englishJudgement));

const textSnapshot = JSON.parse(renderGameToText(finalState, "log", scenario));
assert.ok(Array.isArray(textSnapshot.recent_log_debug));
assert.ok(textSnapshot.recent_log_debug.length > 0);
assert.ok(
  textSnapshot.recent_log_debug
    .filter((entry) => entry.type === "narrative")
    .every((entry) => entry.storyletId && entry.templateId),
);

console.log("Narrative smoke test passed.");
