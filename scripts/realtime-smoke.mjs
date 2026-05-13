import assert from "node:assert/strict";
import {
  COMMAND_TYPES,
  applyCommand,
  createInitialState,
} from "../src/survival-core/engine.js";
import { getScenario } from "../src/game-adapters/scenario-registry.js";

const scenario = getScenario();
let state = createInitialState(scenario);

assert.equal(state.simulation.mode, "realtime");
assert.equal(state.simulation.elapsedSeconds, 0);
assert.equal(state.simulation.timeScale, 1);
assert.equal(state.boat.turn, 1);

state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.ADVANCE_TIME,
  deltaSeconds: 61,
});
assert.ok(state.simulation.elapsedSeconds >= 61);
assert.equal(state.boat.turn, 2);

state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.SET_PAUSED,
  isPaused: true,
});
const pausedElapsed = state.simulation.elapsedSeconds;
state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.ADVANCE_TIME,
  deltaSeconds: 120,
});
assert.equal(state.simulation.elapsedSeconds, pausedElapsed);

state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.ADVANCE_TIME,
  deltaSeconds: 120,
  ignorePause: true,
  useTimeScale: false,
});
assert.ok(state.simulation.elapsedSeconds > pausedElapsed);

state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.SET_PAUSED,
  isPaused: false,
});
state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.SET_TIME_SCALE,
  timeScale: 2,
});
const beforeScaleElapsed = state.simulation.elapsedSeconds;
state = applyCommand(state, scenario, {
  type: COMMAND_TYPES.ADVANCE_TIME,
  deltaSeconds: 10,
});
assert.equal(Math.round(state.simulation.elapsedSeconds - beforeScaleElapsed), 20);

let guard = 0;
while (!scenario.rules.isJudgementDone(state) && guard < 40) {
  state = applyCommand(state, scenario, {
    type: COMMAND_TYPES.ADVANCE_TIME,
    deltaSeconds: 60,
    ignorePause: true,
    useTimeScale: false,
  });
  guard += 1;
}

assert.equal(scenario.rules.isJudgementDone(state), true);
assert.ok(state.simulation.elapsedSeconds <= state.simulation.runDurationSeconds);

console.log("Realtime smoke test passed.");
