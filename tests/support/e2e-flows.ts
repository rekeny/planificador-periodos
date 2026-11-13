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

export function flowFiles(): string[] {
  if (!existsSync(E2E_DIR)) {
    return [];
  }
  return readdirSync(E2E_DIR)
    .filter((file) => /\.ya?ml$/.test(file))
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
  return { file, text, header, commands };
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
  "tapOn|assertVisible|assertNotVisible|inputText|text|below|above";
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

export const FLOW_ROOT = ROOT;
