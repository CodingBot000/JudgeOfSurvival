const storylet = (id, eventId, intent, templateIds, options = {}) => ({
  id,
  eventIds: [eventId],
  intents: [intent],
  baseWeight: options.baseWeight || 10,
  phases: options.phases,
  tags: options.tags || [],
  voiceTags: options.voiceTags || [],
  canUse: options.canUse,
  templateIds,
});

export const storylets = [
  storylet("power.reduce_water", "power_reduce_water", "judge_pressure", [
    "power.reduce_water.1",
    "power.reduce_water.2",
  ]),
  storylet("power.rumor", "power_rumor", "seed_doubt", [
    "power.rumor.1",
    "power.rumor.2",
  ]),
  storylet("power.hidden_food", "power_hidden_food", "tempt", [
    "power.hidden_food.1",
    "power.hidden_food.2",
  ]),
  storylet("power.storm", "power_storm", "environment_pressure", [
    "power.storm.1",
    "power.storm.2",
  ]),
  storylet("minor.whisper_fear", "minor_whisper_fear", "fear", [
    "minor.whisper_fear.1",
    "minor.whisper_fear.2",
  ]),
  storylet("minor.nudge_greed", "minor_nudge_greed", "greed", [
    "minor.nudge_greed.1",
    "minor.nudge_greed.2",
  ]),
  storylet("minor.seed_doubt", "minor_seed_doubt", "seed_doubt", [
    "minor.seed_doubt.1",
    "minor.seed_doubt.2",
  ]),
  storylet("minor.false_comfort", "minor_false_comfort", "false_hope", [
    "minor.false_comfort.1",
    "minor.false_comfort.2",
  ]),
  storylet("minor.heavy_silence", "minor_heavy_silence", "silence", [
    "minor.heavy_silence.1",
    "minor.heavy_silence.2",
  ]),

  storylet("event.hidden_resource_found", "hidden_resource_found", "reveal", [
    "event.hidden_resource_found.1",
    "event.hidden_resource_found.2",
  ]),
  storylet("event.exile_the_weak", "exile_the_weak", "accuse", [
    "event.exile_the_weak.1",
    "event.exile_the_weak.2",
  ], {
    phases: ["scarcity", "fracture", "collapse"],
    tags: ["accusation"],
  }),
  storylet("event.secret_water_drinking", "secret_water_drinking", "betray", [
    "event.secret_water_drinking.1",
    "event.secret_water_drinking.2",
  ]),
  storylet("event.nurse_protects", "nurse_protects", "defend", [
    "event.nurse_protects.1",
    "event.nurse_protects.2",
  ], {
    voiceTags: ["empathetic", "protective"],
  }),
  storylet("event.soldier_takes_order", "soldier_takes_order", "command", [
    "event.soldier_takes_order.1",
    "event.soldier_takes_order.2",
  ], {
    voiceTags: ["authoritarian", "control"],
  }),
  storylet("event.influencer_instigates", "influencer_instigates", "seed_doubt", [
    "event.influencer_instigates.1",
    "event.influencer_instigates.2",
  ], {
    voiceTags: ["soft", "indirect", "manipulative"],
  }),
  storylet("event.stowaway_witch_hunt", "stowaway_witch_hunt", "accuse", [
    "event.stowaway_witch_hunt.1",
    "event.stowaway_witch_hunt.2",
  ], {
    phases: ["fracture", "collapse"],
  }),
  storylet("event.voluntary_sacrifice", "voluntary_sacrifice", "sacrifice", [
    "event.voluntary_sacrifice.1",
    "event.voluntary_sacrifice.2",
  ], {
    phases: ["collapse"],
  }),
  storylet("event.boat_damage", "boat_damage", "environment_pressure", [
    "event.boat_damage.1",
    "event.boat_damage.2",
  ]),
  storylet("event.panic_outburst", "panic_outburst", "lash_out", [
    "event.panic_outburst.1",
    "event.panic_outburst.2",
  ]),
  storylet("event.rescue_signal", "rescue_signal", "hope", [
    "event.rescue_signal.1",
    "event.rescue_signal.2",
  ]),
  storylet("event.silent_turn", "silent_turn", "silence", [
    "event.silent_turn.1",
    "event.silent_turn.2",
  ]),
  storylet("event.leak_spreads", "leak_spreads", "environment_pressure", [
    "event.leak_spreads.1",
    "event.leak_spreads.2",
  ]),
  storylet("event.supplies_crack_hull", "supplies_crack_hull", "environment_pressure", [
    "event.supplies_crack_hull.1",
    "event.supplies_crack_hull.2",
  ]),

  storylet("event.public_accusation.direct", "public_accusation", "accuse", [
    "event.public_accusation.1",
    "event.public_accusation.3",
  ], {
    phases: ["scarcity", "fracture", "collapse"],
    tags: ["social", "accusation"],
    voiceTags: ["direct", "authoritarian", "cold"],
  }),
  storylet("event.public_accusation.indirect", "public_accusation", "accuse", [
    "event.public_accusation.2",
    "event.public_accusation.3",
  ], {
    phases: ["scarcity", "fracture", "collapse"],
    tags: ["social", "accusation"],
    voiceTags: ["soft", "indirect", "manipulative"],
  }),
  storylet("event.survival_pact", "survival_pact", "ally", [
    "event.survival_pact.1",
    "event.survival_pact.2",
  ]),
  storylet("event.exile_vote", "exile_vote", "exile", [
    "event.exile_vote.1",
    "event.exile_vote.2",
  ], {
    phases: ["fracture", "collapse"],
  }),
  storylet("event.exile_resisted", "exile_resisted", "resist", [
    "event.exile_resisted.1",
    "event.exile_resisted.2",
  ], {
    phases: ["fracture", "collapse"],
  }),
  storylet("event.failed_exile_violent", "failed_exile_violent", "violence", [
    "event.failed_exile_violent.1",
    "event.failed_exile_violent.2",
  ], {
    phases: ["fracture", "collapse"],
  }),
  storylet("log.death.exiled", "death", "death", [
    "log.death.exiled.1",
    "log.death.exiled.2",
  ], {
    tags: ["death", "exiled"],
    canUse: (context) => context.target?.death_reason === "exiled",
  }),
  storylet("log.death.sacrifice", "death", "death", [
    "log.death.sacrifice.1",
    "log.death.sacrifice.2",
  ], {
    tags: ["death", "sacrifice"],
    canUse: (context) => context.target?.death_reason === "sacrifice",
  }),
  storylet("log.death.capsized", "death", "death", [
    "log.death.capsized.1",
    "log.death.capsized.2",
  ], {
    tags: ["death", "capsized"],
    canUse: (context) => context.target?.death_reason === "capsized",
  }),
  storylet("log.death.collapse", "death", "death", [
    "log.death.collapse.1",
    "log.death.collapse.2",
  ], {
    tags: ["death", "collapse"],
    canUse: (context) =>
      !["exiled", "sacrifice", "capsized"].includes(
        context.target?.death_reason,
      ),
  }),
  storylet("log.judgement.sacrificial_victim", "judgement_result", "judge", [
    "log.judgement.sacrificial_victim.1",
    "log.judgement.sacrificial_victim.2",
  ], {
    tags: ["judgement"],
    canUse: (context) =>
      context.tokens?.judgementKey === "judgement.sacrificial_victim",
  }),
  storylet("log.judgement.exiled", "judgement_result", "judge", [
    "log.judgement.exiled.1",
    "log.judgement.exiled.2",
  ], {
    tags: ["judgement"],
    canUse: (context) => context.tokens?.judgementKey === "judgement.exiled",
  }),
  storylet("log.judgement.betrayer", "judgement_result", "judge", [
    "log.judgement.betrayer.1",
    "log.judgement.betrayer.2",
  ], {
    tags: ["judgement"],
    canUse: (context) => context.tokens?.judgementKey === "judgement.betrayer",
  }),
  storylet("log.judgement.hypocrite", "judgement_result", "judge", [
    "log.judgement.hypocrite.1",
    "log.judgement.hypocrite.2",
  ], {
    tags: ["judgement"],
    canUse: (context) => context.tokens?.judgementKey === "judgement.hypocrite",
  }),
  storylet("log.judgement.instigator", "judgement_result", "judge", [
    "log.judgement.instigator.1",
    "log.judgement.instigator.2",
  ], {
    tags: ["judgement"],
    canUse: (context) => context.tokens?.judgementKey === "judgement.instigator",
  }),
  storylet("log.judgement.corrupted_survivor", "judgement_result", "judge", [
    "log.judgement.corrupted_survivor.1",
    "log.judgement.corrupted_survivor.2",
  ], {
    tags: ["judgement"],
    canUse: (context) =>
      context.tokens?.judgementKey === "judgement.corrupted_survivor",
  }),
  storylet("log.judgement.victim", "judgement_result", "judge", [
    "log.judgement.victim.1",
    "log.judgement.victim.2",
  ], {
    tags: ["judgement"],
    canUse: (context) => context.tokens?.judgementKey === "judgement.victim",
  }),
  storylet("log.judgement.survivor", "judgement_result", "judge", [
    "log.judgement.survivor.1",
    "log.judgement.survivor.2",
  ], {
    tags: ["judgement"],
    canUse: (context) => context.tokens?.judgementKey === "judgement.survivor",
  }),
];
