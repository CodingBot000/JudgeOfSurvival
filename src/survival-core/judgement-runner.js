export function runJudgementRules(rules, actor) {
  for (const rule of rules) {
    const result = rule(actor);
    if (result) {
      return result;
    }
  }
  return "judgement.unjudged";
}
