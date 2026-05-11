export function renderTemplate(template, context, resolveToken) {
  const parts = Array.isArray(template?.parts)
    ? template.parts
    : [template?.text || String(template || "")];

  return parts
    .map((part) =>
      part.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, token) =>
        String(resolveToken(token, context) ?? ""),
      ),
    )
    .join("\n");
}
