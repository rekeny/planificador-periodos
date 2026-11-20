// Reads the Maestro flows in e2e/ without running them (T036). The repository has no YAML parser
// among its own dependencies, so this reads the small subset the flows use: block style only, one
// key per line, quoted strings. This file holds no test calls.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import es from "@/i18n/es.json";

const ROOT = join(__dirname, "..", "..");
const E2E_DIR = join(ROOT, "e2e");

export interface FlowCommand {
  readonly name: string;
  /** The command line and every line indented under it, comments removed. */
  readonly block: string;
}

export interface Flow {
  readonly file: string;
  readonly text: string;
  readonly header: readonly string[];
  readonly commands: readonly FlowCommand[];
}

/** The flow files of e2e/, only those whose name starts with `prefix` (all of them by default). */
export function flowFiles(prefix = ""): string[] {
  if (!existsSync(E2E_DIR)) {
    return [];
  }
  return readdirSync(E2E_DIR)
    .filter((file) => /\.ya?ml$/.test(file) && file.startsWith(prefix))
    .sort();
}

function withoutComments(text: string): string[] {
  return text.split("\n").filter((line) => !/^\s*#/.test(line));
}

export function readFlow(file: string): Flow {
  const text = readFileSync(join(E2E_DIR, file), "utf8");
  const lines = withoutComments(text);
  const separator = lines.findIndex((line) => line.trim() === "---");
  const header = separator === -1 ? lines : lines.slice(0, separator);
  const body = separator === -1 ? [] : lines.slice(separator + 1);
  const commands: { name: string; block: string }[] = [];
  for (const line of body) {
    const name = /^\s*- (\w+)/.exec(line)?.[1];
    const last = commands.at(-1);
    if (name !== undefined) {
      commands.push({ name, block: line });
    } else if (last !== undefined) {
      last.block += `\n${line}`;
    }
  }
  return { file, text, header, commands: withoutOpenLinkQuestions(commands) };
}

/** True when `text` (the lines right after a deep link) starts with the tap on the iOS question
 * «¿Abrir en …?»: a `runFlow` shown only while its button is visible, which taps that button. */
export function isOpenLinkQuestion(text: string): boolean {
  const [run, when, visible, commands, tap] = text.split("\n");
  return (
    run === "- runFlow:" &&
    when?.trim() === "when:" &&
    visible?.trim() === `visible: "${IOS_OPEN_LINK_BUTTON}"` &&
    commands?.trim() === "commands:" &&
    tap?.trim() === `- tapOn: "${IOS_OPEN_LINK_BUTTON}"`
  );
}

// The question belongs to `openLink` on iOS, so the commands after a link are read as if it were
// not there (its `runFlow` and the nested tap): the checks of what each link shows stay the same.
function withoutOpenLinkQuestions(
  commands: readonly { name: string; block: string }[],
): { name: string; block: string }[] {
  const kept: { name: string; block: string }[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const question = [commands[index], commands[index + 1]]
      .map((command) => command?.block ?? "")
      .join("\n");
    if (kept.at(-1)?.name === "openLink" && isOpenLinkQuestion(question)) {
      index += 1;
    } else {
      kept.push(commands[index] as { name: string; block: string });
    }
  }
  return kept;
}

/** The value of a `key: value` line of the header, without quotes. */
export function headerValue(flow: Flow, key: string): string | undefined {
  const line = flow.header.find((entry) => entry.startsWith(`${key}:`));
  return line === undefined ? undefined : unquote(line.slice(key.length + 1));
}

function unquote(raw: string): string {
  const value = raw.trim();
  const quoted = /^"((?:[^"\\]|\\.)*)"$|^'([^']*)'$/.exec(value);
  return quoted ? (quoted[1] ?? quoted[2] ?? "") : value;
}

export interface Literal {
  readonly key: string;
  readonly value: string;
}

const LITERAL_KEYS =
  "tapOn|assertVisible|assertNotVisible|inputText|text|below|above|rightOf|leftOf";
const LITERAL_LINE = new RegExp(`^\\s*(?:- )?(${LITERAL_KEYS}):\\s*(\\S.*)$`);

/** Every text the flow taps, asserts, types or uses as a position anchor, in order. */
export function literalsOf(flow: Flow): Literal[] {
  const body = flow.commands.map((command) => command.block).join("\n");
  const literals: Literal[] = [];
  for (const line of body.split("\n")) {
    const [, key, raw] = LITERAL_LINE.exec(line) ?? [];
    if (key !== undefined && raw !== undefined) {
      literals.push({ key, value: unquote(raw) });
    }
  }
  return literals;
}

/** Lines where a mapping or a list is written inline: the reader above would not see inside. */
export function inlineStructures(flow: Flow): string[] {
  return flow.commands
    .flatMap((command) => command.block.split("\n"))
    .filter((line) => /:\s*[{[]/.test(line));
}

function flatten(node: unknown): string[] {
  if (typeof node === "string") {
    return [node];
  }
  return Object.values(node as Record<string, unknown>).flatMap(flatten);
}

const TEMPLATES = flatten(es).map((template) => {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withHoles = escaped.replace(/\\\{\\\{\w+\\\}\\\}/g, ".+");
  return new RegExp(`^${withHoles}$`);
});

/** True when the text is one of the Spanish texts of `src/i18n/es.json` (with its holes filled). */
export function isSpanishText(text: string): boolean {
  return TEMPLATES.some((template) => template.test(text));
}

/** The button of the iOS question «¿Abrir en …?» shown before a deep link from outside the app opens
 * it, in Spanish or English as the simulator is set. It is iOS's text, not the app's. */
export const IOS_OPEN_LINK_BUTTON = "Abrir|Open";

/** True when the text is a system text the flows tap, not one of the app. */
export function isSystemText(text: string): boolean {
  return text === IOS_OPEN_LINK_BUTTON;
}

/** The text is a value the flow types itself, or the start of one (a field that stops at its limit). */
export function isTypedHere(text: string, typed: readonly string[]): boolean {
  return typed.some((value) => value.startsWith(text));
}

export function specIds(spec: string): Set<string> {
  const ids = new Set<string>();
  for (const line of spec.split("\n")) {
    const id =
      /^- \*\*(RF-\d{3})\*\*/.exec(line)?.[1] ??
      /^\|\s*(E-\d{3})\s*\|/.exec(line)?.[1];
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

/** The task's own text in tasks.md: its title line (`title`) and every line up to the next task. */
export function taskText(
  tasks: string,
  id: string,
): { title: string; all: string } {
  const lines = tasks.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^- \\[[ x]\\] \\*\\*${id}\\*\\*`).test(line),
  );
  const end = lines.findIndex(
    (line, index) => index > start && /^- \[[ x]\] \*\*T\d{3}\*\*/.test(line),
  );
  const block = lines.slice(start, end === -1 ? undefined : end);
  return { title: block[0] ?? "", all: block.join("\n") };
}

export function idsIn(text: string): string[] {
  return [...new Set(text.match(/\b(?:RF|E)-\d{3}\b/g) ?? [])];
}

/** Texts of the operating system's own pickers, which the flow taps and which are not app texts (T048). */
export const NATIVE_PICKER_TEXTS: readonly string[] = [
  "1",
  "18",
  "30",
  "(?i)previous.*|anterior.*",
  "(?i)date picker|selector de fecha",
];

/** What the pickers show once a date and a time are chosen or added («Añadir hora» gives 12:00): formatted by the app, not in es.json. */
export const PICKED_AND_SHOWN: readonly string[] = [
  "01/03/2026",
  "12:00",
  "18:30",
];

/** The date of today, which the flow computes itself with `evalScript` and then asserts. */
export const TODAY_VARIABLE = "${output.today}";

/** A name may be matched as `.*Name.*` where the platform merges a row's texts into one. */
export function withoutWildcards(text: string): string {
  return text.replace(/^\.\*|\.\*$/g, "");
}

export const FLOW_ROOT = ROOT;
