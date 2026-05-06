import { lifeboatOfGreedScenario } from "../scenarios/lifeboat-of-greed/scenario.js";

export const DEFAULT_SCENARIO_ID = lifeboatOfGreedScenario.id;

const SCENARIOS = {
  [lifeboatOfGreedScenario.id]: lifeboatOfGreedScenario,
};

export function getScenario(scenarioId = DEFAULT_SCENARIO_ID) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  return scenario;
}

export function listScenarios() {
  return Object.values(SCENARIOS);
}
