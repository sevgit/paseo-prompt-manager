export type TemplateVariable = { name: string; fallback?: string };

// `{{ name }}` or `{{ name | default }}`. A leading `$` is GitHub Actions syntax and stays as typed;
// a leading backslash escapes the braces.
const variablePattern = /(\\|\$)?\{\{\s*([^{}|\s][^{}|\n]*?)\s*(?:\|\s*([^{}\n]*?)\s*)?\}\}/g;

/** Variables in order of first use, one per name. The first default given for a name wins. */
export function parseVariables(content: string): TemplateVariable[] {
  const variables = new Map<string, TemplateVariable>();
  for (const [, prefix, name, fallback] of content.matchAll(variablePattern)) {
    if (prefix) continue;
    const known = variables.get(name);
    if (!known) variables.set(name, fallback === undefined ? { name } : { name, fallback });
    else if (known.fallback === undefined && fallback !== undefined) known.fallback = fallback;
  }
  return [...variables.values()];
}

/** Replaces each variable with its value, or its default when no value is given. */
export function fillTemplate(content: string, values: Record<string, string>): string {
  const fallbacks = new Map(parseVariables(content).map((variable) => [variable.name, variable.fallback]));
  return content.replace(variablePattern, (match, prefix: string | undefined, name: string) => {
    if (prefix === "$") return match;
    if (prefix === "\\") return match.slice(1);
    const value = values[name] ?? fallbacks.get(name);
    if (value === undefined) throw new Error(`Enter a value for "${name}".`);
    return value;
  });
}
