import { buildNarrativeContext } from "./context-builder.js";
import { pickFromSeed } from "./seeded-choice.js";
import { renderTemplate } from "./template-renderer.js";
import { resolveToken } from "./token-resolver.js";

export function renderNarrativeLog(state, scenario, entry, tools = {}) {
  const narrative = scenario?.narrative;
  if (!narrative) {
    return "";
  }

  const language = tools.language || state.language || "ko";
  const templates =
    narrative.templates?.[language] || narrative.templates?.ko || narrative.templates?.en;
  const template = templates?.[entry.templateId];
  if (!template) {
    return "";
  }

  const lexicon =
    narrative.lexicon?.[language] || narrative.lexicon?.ko || narrative.lexicon?.en || {};
  const choose = (items, salt) => pickFromSeed(items, entry.variantSeed, salt);
  const context = buildNarrativeContext(state, scenario, entry, {
    ...tools,
    choose,
    language,
    lexicon,
  });
  context.entry = entry;
  context.template = template;

  const scenarioResolver = narrative.resolveToken;
  return renderTemplate(template, context, (token) => {
    if (scenarioResolver) {
      const resolved = scenarioResolver(token, context, {
        ...tools,
        choose,
        language,
        lexicon,
      });
      if (resolved !== undefined && resolved !== null) {
        return resolved;
      }
    }
    return resolveToken(token, context);
  });
}
