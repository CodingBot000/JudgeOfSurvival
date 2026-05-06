export const CORE_SCHEMA_VERSION = 1;

export function stampScenarioMetadata(state, scenario, options = {}) {
  state.schemaVersion = CORE_SCHEMA_VERSION;
  state.scenarioId = scenario.id;
  state.scenarioVersion = scenario.version || 1;
  if (Number.isFinite(options.seed)) {
    state.initialSeed = options.seed;
  }
  return state;
}
