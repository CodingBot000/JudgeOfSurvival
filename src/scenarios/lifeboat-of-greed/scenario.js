import * as rules from "./rules.js";
import { actors } from "./actors.js";
import { balanceTargets } from "./balance.js";
import { effects } from "./effects.js";
import { events } from "./events.js";
import { judgementRules } from "./judgement.js";
import { en } from "./localization.en.js";
import { ko } from "./localization.ko.js";
import { meters } from "./meters.js";
import { narrative } from "./narrative/index.js";
import { phases } from "./phases.js";
import { powers } from "./powers.js";
import { resources } from "./resources.js";

export const lifeboatOfGreedScenario = {
  id: "lifeboat-of-greed",
  version: 1,
  titleKey: "ui.title.chapter_1",
  rules,
  createInitialState: rules.createInitialState,
  actors,
  resources,
  phases,
  powers,
  events,
  effects,
  judgementRules,
  meters,
  narrative,
  localization: { ko, en },
  balanceTargets,
};
