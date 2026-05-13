export const SAVE_VERSION = 1;

export function saveKeyForScenario(scenario) {
  return `${scenario.id}:save:v${SAVE_VERSION}`;
}

export function createSavePayload(state, scenario) {
  const savedState = {
    ...state,
    simulation: state.simulation
      ? {
          ...state.simulation,
          lastAutoSaveAtSeconds: state.simulation.elapsedSeconds || 0,
        }
      : state.simulation,
  };
  return {
    saveVersion: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    state: savedState,
  };
}

export function saveGameToStorage(state, scenario, storage = globalThis.localStorage) {
  if (!storage) {
    return null;
  }
  const payload = createSavePayload(state, scenario);
  try {
    storage.setItem(saveKeyForScenario(scenario), JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function loadSavedGame(scenario, storage = globalThis.localStorage) {
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(saveKeyForScenario(scenario));
  if (!raw) {
    return null;
  }
  try {
    const payload = JSON.parse(raw);
    if (!isCompatibleSave(payload, scenario)) {
      return null;
    }
    return payload.state || null;
  } catch {
    return null;
  }
}

export function hasCompatibleSave(scenario, storage = globalThis.localStorage) {
  return Boolean(loadSavedGame(scenario, storage));
}

export function isCompatibleSave(payload, scenario) {
  return (
    payload?.saveVersion === SAVE_VERSION &&
    payload.scenarioId === scenario.id &&
    payload.scenarioVersion === scenario.version
  );
}
