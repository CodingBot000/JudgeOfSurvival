export function resolveToken(token, context) {
  if (Object.hasOwn(context.tokens || {}, token)) {
    return context.tokens[token];
  }
  if (Object.hasOwn(context.entry?.params || {}, token)) {
    return context.entry.params[token];
  }
  return `{${token}}`;
}
