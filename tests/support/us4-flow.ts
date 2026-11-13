// Helpers for the static checks of the US4 Maestro flow (T060). This file holds no test calls.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import es from "@/i18n/es.json";
import { FLOW_ROOT, taskText } from "./e2e-flows";
import { at, cell, commands, notSee, see, tap } from "./us3-flow";

export { at, cell, commands, notSee, see, tap };
export { UNDO, link, spec } from "./us3-flow";

export const FLOW = "us4-warnings.yaml";
export const task = taskText(
  readFileSync(join(FLOW_ROOT, "specs/001-planificador-v1/tasks.md"), "utf8"),
  "T060",
);

export const LIGHT_RED = see(es.warning.lightRedCell);
export const NO_LIGHT_RED = notSee(es.warning.lightRedCell);
export const IN_RED = see(es.warning.playerInRed);
export const NO_IN_RED = notSee(es.warning.playerInRed);
export const IMPOSSIBLE = see(es.warning.ruleImpossible);
export const NO_IMPOSSIBLE = notSee(es.warning.ruleImpossible);
export const INCOMPLETE = see(es.warning.incompletePeriod);
export const NO_INCONSISTENT = notSee(es.warning.inconsistentPeriod);

interface Position {
  readonly rightOf?: string;
  readonly leftOf?: string;
}

/** A header mark «!» told apart by its position next to the period titles, as the flow writes it. */
export function mark(
  command: "assertVisible" | "assertNotVisible",
  { rightOf, leftOf }: Position,
): string {
  const text = `text: "${es.grid.header.incompleteMark}"`;
  const parts = [`- ${command}:`, text];
  if (rightOf !== undefined) parts.push(`rightOf: "${rightOf}"`);
  if (leftOf !== undefined) parts.push(`leftOf: "${leftOf}"`);
  return parts.join("; ");
}

/** The taps that mark each named player's empty cell of one period. */
export const marks = (period: string, names: readonly string[]): string[] =>
  names.map((name) => tap(cell(name, period, "empty")));

/**
 * The steps in this order, with anything in between; a step that is a list is a group whose lines
 * may come in any order (the assertions after one action). Returns the index of the last line.
 */
export function inOrder(
  all: readonly string[],
  steps: readonly (string | readonly string[])[],
  from = 0,
): number {
  const next = steps.reduce<number>((start, step) => {
    const group = typeof step === "string" ? [step] : step;
    return Math.max(...group.map((line) => at(all, line, start))) + 1;
  }, from);
  return next - 1;
}

/** The lines of the n-th match (1 to 6): from its «Nuevo partido» tap to the next one, or to the app being closed. */
export function matchSection(all: readonly string[], n: number): string[] {
  const starts = all.flatMap((line, index) =>
    line === tap(es.matches.new) ? [index] : [],
  );
  const end = starts[n] ?? all.indexOf("- stopApp");
  return all.slice(starts[n - 1], end);
}

/** How many times each player's cell of `period` is tapped in these lines. */
export function tapsOf(
  lines: readonly string[],
  period: string,
): Record<string, number> {
  const taps: Record<string, number> = {};
  const label = new RegExp(`^- tapOn: "(\\w+), ${period}: casilla vacía"$`);
  for (const line of lines) {
    const name = label.exec(line)?.[1];
    if (name !== undefined) taps[name] = (taps[name] ?? 0) + 1;
  }
  return taps;
}
