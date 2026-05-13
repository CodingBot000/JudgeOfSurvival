const DEFAULT_SIMULATION_STATE = {
  mode: "realtime",
  elapsedSeconds: 0,
  runDurationSeconds: 1500,
  timeScale: 1,
  isPaused: false,
  tickRemainderSeconds: 0,
  blockIndex: 0,
  blockDurationSeconds: 60,
  nextEventAtSeconds: 120,
  nextCardDrawAtSeconds: 90,
  lastAutoSaveAtSeconds: 0,
};

const TIME_SCALES = new Set([1, 2]);

export function createInitialSimulationState(overrides = {}) {
  return {
    ...DEFAULT_SIMULATION_STATE,
    ...overrides,
  };
}

export function ensureSimulationStateMut(state) {
  state.simulation = {
    ...DEFAULT_SIMULATION_STATE,
    ...(state.simulation || {}),
  };
  state.simulation.mode ||= "realtime";
  state.simulation.elapsedSeconds = Math.max(
    0,
    Number(state.simulation.elapsedSeconds || 0),
  );
  state.simulation.runDurationSeconds = Math.max(
    60,
    Number(state.simulation.runDurationSeconds || DEFAULT_SIMULATION_STATE.runDurationSeconds),
  );
  state.simulation.timeScale = TIME_SCALES.has(Number(state.simulation.timeScale))
    ? Number(state.simulation.timeScale)
    : 1;
  state.simulation.isPaused = Boolean(state.simulation.isPaused);
  state.simulation.blockDurationSeconds = Math.max(
    10,
    Number(state.simulation.blockDurationSeconds || DEFAULT_SIMULATION_STATE.blockDurationSeconds),
  );
  state.simulation.blockIndex = Math.max(
    0,
    Math.floor(Number(state.simulation.blockIndex || 0)),
  );
  state.simulation.nextEventAtSeconds = Math.max(
    state.simulation.blockDurationSeconds,
    Number(state.simulation.nextEventAtSeconds || DEFAULT_SIMULATION_STATE.nextEventAtSeconds),
  );
  state.simulation.nextCardDrawAtSeconds = Math.max(
    1,
    Number(state.simulation.nextCardDrawAtSeconds || DEFAULT_SIMULATION_STATE.nextCardDrawAtSeconds),
  );
  state.simulation.lastAutoSaveAtSeconds = Math.max(
    0,
    Number(state.simulation.lastAutoSaveAtSeconds || 0),
  );
  state.simulation.tickRemainderSeconds = Math.max(
    0,
    Number(state.simulation.tickRemainderSeconds || 0),
  );
  return state.simulation;
}

export function advanceSimulationClockMut(state, deltaSeconds, options = {}) {
  const simulation = ensureSimulationStateMut(state);
  const rawDelta = Math.max(0, Number(deltaSeconds || 0));
  if (rawDelta <= 0 || (simulation.isPaused && !options.ignorePause)) {
    return {
      advancedSeconds: 0,
      previousElapsedSeconds: simulation.elapsedSeconds,
      currentElapsedSeconds: simulation.elapsedSeconds,
      fromBlockIndex: simulation.blockIndex,
      toBlockIndex: simulation.blockIndex,
      reachedDuration: simulation.elapsedSeconds >= simulation.runDurationSeconds,
    };
  }

  const scale = options.useTimeScale === false ? 1 : simulation.timeScale;
  const previousElapsedSeconds = simulation.elapsedSeconds;
  const advancedSeconds = rawDelta * scale;
  simulation.elapsedSeconds = Math.min(
    simulation.runDurationSeconds,
    simulation.elapsedSeconds + advancedSeconds,
  );

  const fromBlockIndex = Math.floor(
    previousElapsedSeconds / simulation.blockDurationSeconds,
  );
  const toBlockIndex = Math.floor(
    simulation.elapsedSeconds / simulation.blockDurationSeconds,
  );
  simulation.blockIndex = Math.max(simulation.blockIndex, toBlockIndex);

  return {
    advancedSeconds: simulation.elapsedSeconds - previousElapsedSeconds,
    previousElapsedSeconds,
    currentElapsedSeconds: simulation.elapsedSeconds,
    fromBlockIndex,
    toBlockIndex,
    reachedDuration: simulation.elapsedSeconds >= simulation.runDurationSeconds,
  };
}

export function blockIndexesBetween(clockAdvance) {
  const blocks = [];
  for (
    let blockIndex = clockAdvance.fromBlockIndex + 1;
    blockIndex <= clockAdvance.toBlockIndex;
    blockIndex += 1
  ) {
    blocks.push(blockIndex);
  }
  return blocks;
}

export function setSimulationPausedMut(state, isPaused) {
  ensureSimulationStateMut(state).isPaused = Boolean(isPaused);
}

export function setSimulationTimeScaleMut(state, timeScale) {
  const simulation = ensureSimulationStateMut(state);
  simulation.timeScale = TIME_SCALES.has(Number(timeScale)) ? Number(timeScale) : 1;
}
