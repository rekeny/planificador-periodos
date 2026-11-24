// Helpers for the static checks of the US7 Maestro flow (T078). This file holds no test calls.
// The flow is read with the same reader as the US6 one (`us6-flow.ts`): a list of commands tagged
// with the platform of their `runFlow` branch, and journeys of ordered steps.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import es from "@/i18n/es.json";
import { FLOW_ROOT, flowFiles, taskText } from "./e2e-flows";
import { flowCommands } from "./us6-flow";
import type { Tagged } from "./us6-flow";

export const US7_FILE = "us7-squad.yaml";

const specs = join(FLOW_ROOT, "specs/001-planificador-v1");
export const spec = readFileSync(join(specs, "spec.md"), "utf8");
export const task = taskText(
  readFileSync(join(specs, "tasks.md"), "utf8"),
  "T078",
);

export const present = (): boolean => flowFiles("us7-").includes(US7_FILE);
export const commands7 = (): Tagged[] => flowCommands(US7_FILE);
export const texts7 = (): string[] => commands7().map((c) => c.text);

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A text of the screen in one of the forms the flow may use: as it is, or between `.*` wildcards
 * (iOS merges the texts of a row into one label, Android keeps them apart).
 */
const asked = (text: string): string => `(?:\\.\\*)?${escape(text)}(?:\\.\\*)?`;

/** `assertVisible` (or the wait for it) of a text, alone or with the wildcards of a row. */
export const shows = (text: string): RegExp =>
  new RegExp(
    `^- assertVisible: "${asked(text)}"$|^- extendedWaitUntil:; visible: "${asked(text)}"(?:;.*)?$`,
  );
/** `assertNotVisible` of a text, alone or with the wildcards of a row. */
export const hides = (text: string): RegExp =>
  new RegExp(`^- assertNotVisible: "${asked(text)}"$`);

/**
 * What tells a player's number: the bare number (Android keeps the texts of a row apart), the merged
 * label of a row («7, Juan», possibly with more texts after it) or an alternation of those forms
 * (`7|.*7, Juan.*`, one line that works on both platforms, since Maestro matches the whole text).
 */
const numberForm = (name: string, number: number): string =>
  `(?:${number}|(?:\\.\\*)?(?:${number}, ${escape(name)}|${escape(name)}, ${number})[^"|]*)`;
const numberText = (name: string, number: number): string =>
  `${numberForm(name, number)}(?:\\|${numberForm(name, number)})*`;
export const showsNumber = (name: string, number: number): RegExp =>
  new RegExp(`^- assertVisible: "${numberText(name, number)}"$`);
export const hidesNumber = (name: string, number: number): RegExp =>
  new RegExp(`^- assertNotVisible: "${numberText(name, number)}"$`);

/** A tap on a row of the team screen, by the player's name (the row may be merged with the number). */
export const tapsPlayer = (name: string): RegExp =>
  new RegExp(
    `^- tapOn: "[^"]*${escape(name)}[^"]*"$|^- tapOn:; (?:[^;]+; )*text: "[^"]*${escape(name)}[^"]*"(?:;.*)?$`,
  );

export const ERASE = /^- eraseText(?::.*)?$/;
export const ENTER = "- pressKey: Enter";
export const CLOSE_KEYBOARD = "- runFlow: subflows/close-keyboard.yaml";
/** The iOS edge swipe that goes back from a pushed screen (Android has the Back command). */
export const EDGE_SWIPE = /^- swipe:; start: 2%, 50%/;

const fill = (template: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  );

export const deactivateTitle = (name: string): string =>
  fill(es.confirm.deactivatePlayer.title, { name });
export const deleteTeamTitle = (name: string): string =>
  fill(es.confirm.deleteTeam.title, { name });
/** The message of the team confirmation with the counts of the answered D3-2 plural forms. */
export function deleteTeamMessage(players: number, matches: number): string {
  const part = (one: string, other: string, count: number): string =>
    fill(count === 1 ? one : other, { count: String(count) });
  const { deleteTeam } = es.confirm;
  return fill(deleteTeam.message, {
    players: part(deleteTeam.players_one, deleteTeam.players_other, players),
    matches: part(deleteTeam.matches_one, deleteTeam.matches_other, matches),
  });
}
export const callUpCount = (count: number): string =>
  fill(es.callUp.count, { count: String(count) });
