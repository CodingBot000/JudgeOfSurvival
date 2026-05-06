import { applyCommand, createInitialState } from "./engine.js";

export function simulateScenario(scenario, commands, options = {}) {
  let state = createInitialState(scenario, options);
  for (const command of commands) {
    state = applyCommand(state, scenario, command);
  }
  return state;
}
