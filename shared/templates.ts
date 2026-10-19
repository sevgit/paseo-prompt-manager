export type TemplateVariable = { name: string; fallback?: string };

/** `{{ name }}` or `{{ name | default }}`, capturing the name and the default. */
export const variableSource = String.raw`\{\{\s*([^{}|\s][^{}|\n]*?)\s*(?:\|\s*([^{}\n]*?)\s*)?\}\}`;
// A leading `$` is GitHub Actions syntax and stays as typed; a leading backslash escapes the braces.
const variablePattern = new RegExp(String.raw`(\\|\$)?` + variableSource, "g");

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

export type TemplateSegment = { kind: "text"; text: string } | { kind: "variable"; name: string; fallback?: string };

/** Splits literal text, such as a code span, into text and variables. Escaped and `${{` forms stay text. */
export function splitVariables(text: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let offset = 0;
  for (const match of text.matchAll(variablePattern)) {
    if (match[1]) continue;
    if (match.index > offset) segments.push({ kind: "text", text: text.slice(offset, match.index) });
    segments.push(match[3] === undefined ? { kind: "variable", name: match[2] } : { kind: "variable", name: match[2], fallback: match[3] });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) segments.push({ kind: "text", text: text.slice(offset) });
  return segments;
}
