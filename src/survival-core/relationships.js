export function addAllianceMut(left, right) {
  if (!left || !right || left.id === right.id) return;
  left.alliances ||= [];
  right.alliances ||= [];
  left.enemies = (left.enemies || []).filter((id) => id !== right.id);
  right.enemies = (right.enemies || []).filter((id) => id !== left.id);
  if (!left.alliances.includes(right.id)) left.alliances.push(right.id);
  if (!right.alliances.includes(left.id)) right.alliances.push(left.id);
}

export function addEnemyMut(left, right) {
  if (!left || !right || left.id === right.id) return;
  left.enemies ||= [];
  right.enemies ||= [];
  left.alliances = (left.alliances || []).filter((id) => id !== right.id);
  right.alliances = (right.alliances || []).filter((id) => id !== left.id);
  if (!left.enemies.includes(right.id)) left.enemies.push(right.id);
  if (!right.enemies.includes(left.id)) right.enemies.push(left.id);
}
