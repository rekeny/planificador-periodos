// Helpers for the static checks of the US3 Maestro flows (T056). This file holds no test calls.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import es from "@/i18n/es.json";
import { FLOW_ROOT, readFlow, taskText } from "./e2e-flows";

export const PLANNING = "us3-planning.yaml";
export const INTERRUPTION = "us3-interruption.yaml";
export const US3_FILES = [INTERRUPTION, PLANNING];

const specs = join(FLOW_ROOT, "specs/001-planificador-v1");
export const spec = readFileSync(join(specs, "spec.md"), "utf8");
export const task = taskText(
  readFileSync(join(specs, "tasks.md"), "utf8"),
  "T056",
);

/** Every command of the flow (nested ones too) on one line: `- tapOn:; text: "Quitar"; below: "…"`. */
export function commands(file: string): string[] {
  return readFlow(file).commands.map((command) =>
    command.block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .join("; "),
  );
}

const fill = (template: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  );

type CellState = "empty" | "starter" | "sub";

/** The accessible label of a grid cell as the app writes it (RF-043). */
export function cell(name: string, period: string, state: CellState): string {
  return fill(es.grid.cell[state], { name, period });
}

export const tap = (text: string): string => `- tapOn: "${text}"`;
export const see = (text: string): string => `- assertVisible: "${text}"`;
export const notSee = (text: string): string => `- assertNotVisible: "${text}"`;

export const UNDO = tap(es.grid.undo);
export const UNDO_OFF = `- assertVisible:; text: "${es.grid.undo}"; enabled: false`;
/** A tap on the dark area around a dialog, then the Android Back command (iOS has none): neither closes it. */
export const OUTSIDE_AND_BACK = [
  "- tapOn:; point: 5%,5%",
  "- runFlow:; when:; platform: Android; commands:",
  "- back",
];
export const SWIPE_LEFT = "- swipe:; start: 90%, 50%; end: 30%, 50%";

export const removeOvertimeTitle = (number: number): string =>
  fill(es.confirm.removeOvertime.title, { number: String(number) });
export const removeFromCallUpTitle = (name: string): string =>
  fill(es.confirm.removeFromCallUp.title, { name });

/** The flow line that opens match `id` (or any text) with the app's own scheme. */
export const link = (path: string): string =>
  `- openLink: planificadorperiodos://${path}`;

/** The index of `line` at or after `from`; the test fails with the line's text when it is missing. */
export function at(all: readonly string[], line: string, from = 0): number {
  const index = all.indexOf(line, from);
  if (index < 0) {
    throw new Error(`line not found after ${from}: ${line}`);
  }
  return index;
}

/** The index where `steps` appear one right after the other, at or after `from`. */
export function run(
  all: readonly string[],
  steps: readonly string[],
  from = 0,
): number {
  for (let index = from; index + steps.length <= all.length; index += 1) {
    if (steps.every((step, offset) => all[index + offset] === step)) {
      return index;
    }
  }
  throw new Error(`steps not found after ${from}: ${steps.join(" | ")}`);
}
