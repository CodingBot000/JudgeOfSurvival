export function applyPowerEffectMut(state, powerId, tools) {
  if (powerId === "whisper_fear") {
    const target = tools.highestAlive(state, "fear");
    if (target) {
      target.fear += 5;
      target.trust -= 2;
      target.accusation_score += 2;
      tools.addNarrativeLogMut(state, {
        id: "log.minor_whisper_fear",
        eventId: "minor_whisper_fear",
        intent: "fear",
        target,
        params: tools.nameParams(target),
        tags: ["power", "minor", "fear", tools.phaseForTurn(state.boat.turn)],
      });
    }
    return true;
  }

  if (powerId === "nudge_greed") {
    const target = tools.highestAlive(state, "greed");
    if (target) {
      target.greed += 5;
      target.morality -= 2;
      target.accusation_score += 2;
      tools.addNarrativeLogMut(state, {
        id: "log.minor_nudge_greed",
        eventId: "minor_nudge_greed",
        intent: "greed",
        target,
        params: tools.nameParams(target),
        tags: ["power", "minor", "greed", tools.phaseForTurn(state.boat.turn)],
      });
    }
    return true;
  }

  if (powerId === "seed_doubt") {
    const target = tools.lowestAlive(state, "trust");
    if (target) {
      target.trust -= 5;
      target.accusation_score += 3;
      for (const character of tools.aliveCharacters(state)) {
        if (character.id !== target.id) {
          character.trust -= 1;
        }
      }
      tools.addNarrativeLogMut(state, {
        id: "log.minor_seed_doubt",
        eventId: "minor_seed_doubt",
        intent: "seed_doubt",
        target,
        params: tools.nameParams(target),
        tags: ["power", "minor", "doubt", tools.phaseForTurn(state.boat.turn)],
      });
    }
    return true;
  }

  if (powerId === "false_comfort") {
    for (const character of tools.aliveCharacters(state)) {
      character.fear -= 3;
      character.trust += 1;
    }
    state.boat.rescue_chance = Math.max(0, state.boat.rescue_chance - 3);
    state.boat.despair = Math.max(0, state.boat.despair - 1);
    tools.addNarrativeLogMut(state, {
      id: "log.minor_false_comfort",
      eventId: "minor_false_comfort",
      intent: "false_hope",
      tags: ["power", "minor", "hope", tools.phaseForTurn(state.boat.turn)],
    });
    return true;
  }

  if (powerId === "heavy_silence") {
    for (const character of tools.aliveCharacters(state)) {
      character.fear += 2;
      character.morality -= 1;
    }
    state.boat.despair += 1;
    tools.addNarrativeLogMut(state, {
      id: "log.minor_heavy_silence",
      eventId: "minor_heavy_silence",
      intent: "silence",
      tags: ["power", "minor", "silence", tools.phaseForTurn(state.boat.turn)],
    });
    return true;
  }

  if (powerId === "reduce_water") {
    state.boat.water = Math.max(0, state.boat.water - 1);
    for (const character of tools.aliveCharacters(state)) {
      character.fear += 8;
      if (character.greed >= 60) {
        character.greed += 5;
        character.accusation_score += 2;
      }
    }
    state.boat.despair += 1;
    tools.addNarrativeLogMut(state, {
      id: "log.power_reduce_water",
      eventId: "power_reduce_water",
      intent: "judge_pressure",
      tags: ["power", "major", "water", tools.phaseForTurn(state.boat.turn)],
    });
    return true;
  }

  if (powerId === "rumor") {
    const target = tools.lowestAlive(state, "trust");
    for (const character of tools.aliveCharacters(state)) {
      character.trust -= 5;
    }
    if (target) {
      target.fear += 10;
      target.accusation_score += 6;
    }
    const influencers = tools
      .aliveCharacters(state)
      .filter((character) => character.influence >= 60);
    const instigator = tools.highestFrom(influencers, "influence");
    if (instigator) {
      instigator.instigation_count += 1;
    }
    tools.addNarrativeLogMut(state, {
      id: "log.power_rumor",
      eventId: "power_rumor",
      intent: "seed_doubt",
      target,
      params: target ? tools.nameParams(target) : {},
      tags: ["power", "major", "doubt", tools.phaseForTurn(state.boat.turn)],
    });
    return true;
  }

  if (powerId === "hidden_food") {
    const target = tools.highestAlive(state, "greed");
    if (target) {
      target.has_hidden_resource = true;
      target.greed += 10;
      target.hypocrisy_count += 1;
      target.accusation_score += 6;
    }
    tools.addNarrativeLogMut(state, {
      id: "log.power_hidden_food",
      eventId: "power_hidden_food",
      intent: "tempt",
      target,
      params: target ? tools.nameParams(target) : {},
      tags: ["power", "major", "food", tools.phaseForTurn(state.boat.turn)],
    });
    return true;
  }

  if (powerId === "storm") {
    state.boat.storm_level += 1;
    state.boat.stability -= 15;
    state.boat.hull_damage += 8;
    state.boat.water_ingress += 1;
    state.boat.despair += 2;
    for (const character of tools.aliveCharacters(state)) {
      character.fear += 12;
      if (character.health <= 60) {
        character.health -= 5;
      }
    }
    tools.addNarrativeLogMut(state, {
      id: "log.power_storm",
      eventId: "power_storm",
      intent: "environment_pressure",
      tags: ["power", "major", "storm", tools.phaseForTurn(state.boat.turn)],
    });
    return true;
  }

  return false;
}
