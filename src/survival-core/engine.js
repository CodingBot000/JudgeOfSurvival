import { COMMAND_TYPES } from "./commands.js";
import { stampScenarioMetadata } from "./state-schema.js";

export { COMMAND_TYPES };

export function createInitialState(scenario, options = {}) {
  assertScenario(scenario);
  const state = scenario.createInitialState(options);
  return stampScenarioMetadata(state, scenario, options);
}

export function applyCommand(state, scenario, command) {
  assertScenario(scenario);
  const type = command?.type;

  if (type === COMMAND_TYPES.NEXT_TURN) {
    return stampScenarioMetadata(scenario.rules.nextTurn(state), scenario);
  }

  if (type === COMMAND_TYPES.USE_MINOR_POWER) {
    return stampScenarioMetadata(
      scenario.rules.useMinorPower(state, command.powerId),
      scenario,
    );
  }

  if (type === COMMAND_TYPES.USE_MAJOR_POWER) {
    return stampScenarioMetadata(
      scenario.rules.useMajorPower(state, command.powerId),
      scenario,
    );
  }

  if (type === COMMAND_TYPES.USE_POWER) {
    const power = scenario.powers?.all?.find((item) => item.id === command.powerId);
    if (power?.tier === "major") {
      return stampScenarioMetadata(
        scenario.rules.useMajorPower(state, command.powerId),
        scenario,
      );
    }
    return stampScenarioMetadata(
      scenario.rules.useMinorPower(state, command.powerId),
      scenario,
    );
  }

  if (type === COMMAND_TYPES.FINISH_CHAPTER) {
    return stampScenarioMetadata(scenario.rules.requestFinishChapter(state), scenario);
  }

  if (type === COMMAND_TYPES.RESTART) {
    return createInitialState(scenario, command.options || {});
  }

  throw new Error(`Unknown command type: ${String(type)}`);
}

export function replayCommands(scenario, commands, options = {}) {
  return commands.reduce(
    (state, command) => applyCommand(state, scenario, command),
    createInitialState(scenario, options),
  );
}

function assertScenario(scenario) {
  if (!scenario?.id || !scenario?.rules || !scenario?.createInitialState) {
    throw new Error("A valid scenario definition is required.");
  }
}
