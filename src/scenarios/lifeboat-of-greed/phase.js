export const LIFEBOAT_PHASES = [
  "discomfort",
  "scarcity",
  "fracture",
  "collapse",
];

export function phaseForTurn(turn = 1) {
  const normalizedTurn = Number(turn) || 1;
  if (normalizedTurn <= 4) return "discomfort";
  if (normalizedTurn <= 9) return "scarcity";
  if (normalizedTurn <= 14) return "fracture";
  return "collapse";
}
