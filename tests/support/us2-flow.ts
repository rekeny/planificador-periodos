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

/** The texts the flow asserts are visible: those of `assertVisible`, then those `scrollUntilVisible`
 * looks for, which fails like an assertion when its text never shows (the call-up count sits below
 * the first screen of a phone). */
export function visible(): string[] {
  const asserted = flowLiterals()
    .filter((literal) => literal.key === "assertVisible")
    .map((literal) => literal.value);
  const scrolledTo = readFlow(US2_FILE)
    .commands.filter((command) => command.name === "scrollUntilVisible")
    .flatMap((command) => {
      const text = /^\s*text: "([^"]*)"$/m.exec(command.block)?.[1];
      return text === undefined ? [] : [text];
    });
  return [...asserted, ...scrolledTo];
}

/** The command lines of the flow, trimmed, one per command (nested commands included). */
export function lines(): string[] {
  return readFlow(US2_FILE).commands.map((command) => command.block.trim());
}

/**
 * Everything the flow types: each `inputText` text, and the join of every run of consecutive
 * `inputText` steps. Maestro gives each command 120 s and typing is slow on Android (0.18 to 0.6 s
 * per character), so a long text may be typed in pieces: what the field receives is their join.
 */
export function typedTexts(): string[] {
  const texts: string[] = [];
  let run: string[] = [];
  const flush = (): void => {
    if (run.length > 1) {
      texts.push(run.join(""));
    }
    run = [];
  };
  for (const command of readFlow(US2_FILE).commands) {
    const value = /^\s*(?:- )?inputText: "(.*)"$/m.exec(command.block)?.[1];
    if (command.name === "inputText" && value !== undefined) {
      texts.push(value);
      run.push(value);
    } else {
      flush();
    }
  }
  flush();
  return texts;
}
