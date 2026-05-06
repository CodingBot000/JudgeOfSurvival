export const minorPowers = [
  { id: "whisper_fear", tier: "minor", labelKey: "ui.button.whisper_fear" },
  { id: "nudge_greed", tier: "minor", labelKey: "ui.button.nudge_greed" },
  { id: "seed_doubt", tier: "minor", labelKey: "ui.button.seed_doubt" },
  { id: "false_comfort", tier: "minor", labelKey: "ui.button.false_comfort" },
  { id: "heavy_silence", tier: "minor", labelKey: "ui.button.heavy_silence" },
];

export const majorPowers = [
  { id: "reduce_water", tier: "major", labelKey: "ui.button.reduce_water" },
  { id: "rumor", tier: "major", labelKey: "ui.button.rumor" },
  { id: "hidden_food", tier: "major", labelKey: "ui.button.hidden_food" },
  { id: "storm", tier: "major", labelKey: "ui.button.storm" },
];

export const powers = {
  minor: minorPowers,
  major: majorPowers,
  all: [...minorPowers, ...majorPowers],
};
