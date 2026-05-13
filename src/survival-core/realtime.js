import { stampScenarioMetadata } from "./state-schema.js";

export function advanceSimulationTime(state, deltaSeconds, scenario, options = {}) {
  if (!scenario?.rules?.advanceSimulationTime) {
    throw new Error("Scenario does not support realtime simulation.");
  }
  return stampScenarioMetadata(
    scenario.rules.advanceSimulationTime(state, deltaSeconds, options),
    scenario,
  );
}
