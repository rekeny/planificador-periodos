// Helpers for the static checks of the US6 Maestro flow (T073). This file holds no test calls.
// The flow is read as a list of commands, each tagged with the platform of the `runFlow` branch it
// sits in, and a journey is a list of steps that must appear in that order, on iOS and on Android
// alike (steps of one platform only count in that platform's view).
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FLOW_ROOT, flowFiles, readFlow, taskText } from "./e2e-flows";

export const US6_FILE = "us6-matches.yaml";

const specs = join(FLOW_ROOT, "specs/001-planificador-v1");
export const spec = readFileSync(join(specs, "spec.md"), "utf8");
export const task = taskText(
  readFileSync(join(specs, "tasks.md"), "utf8"),
  "T073",
);

export const present = (): boolean => flowFiles("us6-").includes(US6_FILE);

export type Platform = "iOS" | "Android";
export interface Tagged {
  readonly text: string;
  readonly platform: Platform | null;
}

const PLATFORM_BRANCH = /^- runFlow:; when:; platform: (iOS|Android);/;

function bodyLines(file: string): string[] {
  const lines = readFlow(file)
    .text.split("\n")
    .filter((line) => !/^\s*#/.test(line));
  const separator = lines.findIndex((line) => line.trim() === "---");
  return separator === -1 ? [] : lines.slice(separator + 1);
}

/**
 * Every command of the flow on one line, nested ones too (`- tapOn:; text: "Local"; below: "Local"`),
 * with the platform of the `runFlow` branch it is inside, or null at the top level. An empty list
 * when the flow file does not exist.
 */
export function flowCommands(file = US6_FILE): Tagged[] {
  if (!flowFiles("").includes(file)) {
    return [];
  }
  const raw: { indent: number; text: string }[] = [];
  for (const line of bodyLines(file)) {
    const text = line.trim();
    if (text === "") {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    const last = raw.at(-1);
    if (/^- \w+/.test(text) || last === undefined) {
      raw.push({ indent, text });
    } else {
      last.text += `; ${text}`;
    }
  }
  let branch: { indent: number; platform: Platform } | null = null;
  return raw.map(({ indent, text }) => {
    if (branch !== null && indent <= branch.indent) {
      branch = null;
    }
    const inside = branch?.platform ?? null;
    const opens = PLATFORM_BRANCH.exec(text)?.[1];
    if (branch === null && opens !== undefined) {
      branch = { indent, platform: opens as Platform };
    }
    return { text, platform: inside };
  });
}

export const texts = (): string[] => flowCommands().map((c) => c.text);

export type Matcher = string | RegExp;
/** `on` pins a step to a platform branch; `never` forbids a command between the steps around it. */
export type Step =
  | Matcher
  | { readonly on: Platform; readonly is: Matcher }
  | { readonly never: Matcher };

const matches = (matcher: Matcher, text: string): boolean =>
  typeof matcher === "string" ? text === matcher : matcher.test(text);

const isBranch = (step: Step): step is { on: Platform; is: Matcher } =>
  typeof step === "object" && !(step instanceof RegExp) && "on" in step;
const isNever = (step: Step): step is { never: Matcher } =>
  typeof step === "object" && !(step instanceof RegExp) && "never" in step;
function matcherOf(step: Step): Matcher {
  if (typeof step === "string" || step instanceof RegExp) return step;
  return "is" in step ? step.is : step.never;
}
const platformOf = (step: Step): Platform | null =>
  isBranch(step) ? step.on : null;
const describe_ = (step: Step): string => String(matcherOf(step));

/** The step of `steps` that is missing or out of order in the flow as one platform runs it. */
function missingIn(
  platform: Platform,
  all: readonly Tagged[],
  steps: readonly Step[],
): string | null {
  const view = all.filter(
    (c) => c.platform === null || c.platform === platform,
  );
  const wanted = steps.filter(
    (step) => isNever(step) || (platformOf(step) ?? platform) === platform,
  );
  let cursor = 0;
  let never: Matcher[] = [];
  for (const step of wanted) {
    if (isNever(step)) {
      never = [...never, step.never];
      continue;
    }
    const found = view.findIndex(
      (c, index) =>
        index >= cursor &&
        c.platform === platformOf(step) &&
        matches(matcherOf(step), c.text),
    );
    if (found < 0) {
      return `${platform}: ${describe_(step)} (after: ${view[cursor - 1]?.text ?? "the start"})`;
    }
    const between = view.slice(cursor, found).map((c) => c.text);
    const hit = between.find((text) => never.some((m) => matches(m, text)));
    if (hit !== undefined) {
      return `${platform}: ${hit} must not come before ${describe_(step)}`;
    }
    never = [];
    cursor = found + 1;
  }
  return null;
}

/** Null when the steps appear in order on both platforms, else the first one that does not. */
export function missingStep(
  steps: readonly Step[],
  all: readonly Tagged[] = flowCommands(),
): string | null {
  return (
    missingIn("iOS", all, steps) ?? missingIn("Android", all, steps) ?? null
  );
}

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const tap = (text: string): string => `- tapOn: "${text}"`;
export const notSee = (text: string): string => `- assertNotVisible: "${text}"`;
export const type = (text: string): string => `- inputText: "${text}"`;
/** A check that a text is on screen: `assertVisible`, or the wait `extendedWaitUntil` for it. */
export const see = (text: string): RegExp =>
  new RegExp(
    `^- assertVisible: "${escape(text)}"$|^- extendedWaitUntil:; visible: "${escape(text)}"(?:;.*)?$`,
  );
/** A tap on a text, alone or with a selector such as `index: 1` or `below: …`. */
export const tapsOn = (text: string): RegExp =>
  new RegExp(
    `^- tapOn: "${escape(text)}"$|^- tapOn:; (?:[^;]+; )*text: "${escape(text)}"(?:;.*)?$`,
  );
export const scrollTo = (text: string): RegExp =>
  new RegExp(
    `^- scrollUntilVisible:; element:; text: "${escape(text)}"(?:;.*)?$`,
  );

export const android = (is: Matcher): Step => ({ on: "Android", is });
export const ios = (is: Matcher): Step => ({ on: "iOS", is });
export const BACK = "- back";
/** A tap outside a dialog, on the dark strip at the left edge of the screen. */
export const OUTSIDE = /^- tapOn:; point: "?2%, ?50%"?$/;
