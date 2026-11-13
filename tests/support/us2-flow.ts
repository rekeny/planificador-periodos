// Helpers for the static checks of the US2 Maestro flow (T048). This file holds no test calls.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import es from "@/i18n/es.json";
import { FLOW_ROOT, literalsOf, readFlow, taskText } from "./e2e-flows";
import type { Literal } from "./e2e-flows";

export const US2_FILE = "us2-match-and-call-up.yaml";

const specs = join(FLOW_ROOT, "specs/001-planificador-v1");
export const spec = readFileSync(join(specs, "spec.md"), "utf8");
export const task = taskText(
  readFileSync(join(specs, "tasks.md"), "utf8"),
  "T048",
);

/** The call-up range warning as the app writes it (defaults: 6 periods, minimum 9). */
export function range(count: number, format = 6, min = 9): string {
  return es.warning.callUpRange
    .replace("{{format}}", String(format))
    .replace("{{min}}", String(min))
    .replace("{{count}}", String(count));
}

export function flowLiterals(): Literal[] {
  return literalsOf(readFlow(US2_FILE));
}

/** The texts the flow asserts are visible, in order. */
export function visible(): string[] {
  return flowLiterals()
    .filter((literal) => literal.key === "assertVisible")
    .map((literal) => literal.value);
}

/** The command lines of the flow, trimmed, one per command (nested commands included). */
export function lines(): string[] {
  return readFlow(US2_FILE).commands.map((command) => command.block.trim());
}
