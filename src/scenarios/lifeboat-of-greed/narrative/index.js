import { lexiconEn } from "./lexicon.en.js";
import { lexiconKo } from "./lexicon.ko.js";
import {
  buildLifeboatNarrativeContext,
  resolveLifeboatToken,
} from "./situation-tags.js";
import { storylets } from "./storylets.js";
import { templatesEn } from "./templates.en.js";
import { templatesKo } from "./templates.ko.js";
import { voiceProfiles } from "./voice-profiles.js";

export const narrative = {
  storylets,
  templates: {
    en: templatesEn,
    ko: templatesKo,
  },
  lexicon: {
    en: lexiconEn,
    ko: lexiconKo,
  },
  voiceProfiles,
  buildContext: buildLifeboatNarrativeContext,
  resolveToken: resolveLifeboatToken,
};
