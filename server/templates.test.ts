import assert from "node:assert/strict";
import { test } from "node:test";
import { fillTemplate, parseVariables } from "../shared/templates.ts";

test("variables are listed once each, in order of first use, with their defaults", () => {
  assert.deepEqual(parseVariables("Assign to {{ person | me }}, PM {{Product Manager}}, QA {{QA}}, cc {{ person }}."), [
    { name: "person", fallback: "me" },
    { name: "Product Manager" },
    { name: "QA" },
  ]);
  assert.deepEqual(parseVariables("# Plain\n\nNo variables here."), []);
});

test("defaults may be empty, contain pipes, or come from a later use of the name", () => {
  assert.deepEqual(parseVariables("{{ note | }}"), [{ name: "note", fallback: "" }]);
  assert.deepEqual(parseVariables("{{ cmd | a | b }}"), [{ name: "cmd", fallback: "a | b" }]);
  assert.deepEqual(parseVariables("{{ x }} {{ x | first }} {{ x | second }}"), [{ name: "x", fallback: "first" }]);
});

test("GitHub Actions expressions, escaped braces and malformed braces are not variables", () => {
  assert.deepEqual(parseVariables("run: echo ${{ github.sha }} \\{{ literal }} {{ }} {{ a\nb }} {{ open"), []);
  assert.deepEqual(parseVariables("```sh\ngit checkout {{ branch | main }}\n```"), [{ name: "branch", fallback: "main" }]);
});

test("filling replaces every use and falls back to defaults", () => {
  const template = "Look at {{ module }}. Assign to {{ person | me }}. Then check {{module}} again.";
  assert.equal(fillTemplate(template, { module: "server/git.ts" }), "Look at server/git.ts. Assign to me. Then check server/git.ts again.");
  assert.equal(fillTemplate(template, { module: "a", person: "Sam" }), "Look at a. Assign to Sam. Then check a again.");
  assert.equal(fillTemplate("Note: {{ note | none }}.", { note: "" }), "Note: .");
});

test("filling keeps GitHub Actions expressions and unescapes escaped braces", () => {
  assert.equal(fillTemplate("${{ github.sha }} \\{{ name }} {{ name }}", { name: "x" }), "${{ github.sha }} {{ name }} x");
});

test("filling without a value for a variable that has no default fails", () => {
  assert.throws(() => fillTemplate("Review {{ module }}", {}), /Enter a value for "module"/);
});

test("content without variables is returned unchanged", () => {
  const content = "# Review\n\nUse {single} braces and `{{` alone.";
  assert.equal(fillTemplate(content, {}), content);
});
