// Helpers for the static checks of the US5 Maestro flows (T066). This file holds no test calls.
import es from "@/i18n/es.json";
import { flowFiles } from "./e2e-flows";
import { cell, commands, notSee, run, see, tap } from "./us3-flow";

export {
  UNDO,
  at,
  link,
  notSee,
  removeFromCallUpTitle,
  run,
  see,
  tap,
} from "./us3-flow";
export { cell };

export const SUBS = "us5-subs.yaml";
export const UNDO_FLOW = "us5-undo-after-call-up.yaml";
const linesOf = (file: string): string[] =>
  flowFiles("us5-").includes(file) ? commands(file) : [];
export const subs = linesOf(SUBS);
export const undo = linesOf(UNDO_FLOW);

export const QUESTION = es.grid.subOrStarter.question;
export const CHOICE = es.grid.chooseReplaced.title;
export const REMINDER = es.grid.removeXReminder.message;
export const ANYWAY = es.grid.removeXReminder.removeAnyway;
export const MENU = es.grid.cellMenu;
export const CANCEL = es.common.cancel;
export const empty = (name: string, period: string): string =>
  see(cell(name, period, "empty"));
export const starter = (name: string, period: string): string =>
  see(cell(name, period, "starter"));
export const sub = (name: string, period: string): string =>
  see(cell(name, period, "sub"));
export const tapEmpty = (name: string, period: string): string =>
  tap(cell(name, period, "empty"));
export const press = (name: string, period: string, state: "starter" | "sub") =>
  `- longPressOn: "${cell(name, period, state)}"`;
/** The prefix iOS adds to a choice option: it merges the number and the name into «5, Eva». */
export const OPTION_PREFIX = "(\\\\d+, )?";
export const pick = (name: string): string =>
  `- tapOn:; text: "${OPTION_PREFIX}${name}"; below: "${CHOICE}"`;
export const scrollTo = (text: string): string =>
  `- scrollUntilVisible:; element:; text: "${text}"`;
export const header = (mark: string, right: string, left?: string): string =>
  [
    "- assertVisible:",
    `text: "${mark}"`,
    `rightOf: "${right}"`,
    ...(left === undefined ? [] : [`leftOf: "${left}"`]),
  ].join("; ");
/** Marks the empty cells of one period one after the other, checking each X. */
export const fill = (period: string, names: readonly string[]): string[] =>
  names.flatMap((name) => [tapEmpty(name, period), starter(name, period)]);

const OUTSIDE = "- tapOn:; point: 2%,50%";
const ANDROID_BACK = [
  "- runFlow:; when:; platform: Android; commands:",
  "- back",
];
const IOS_OUTSIDE = ["- runFlow:; when:; platform: iOS; commands:", OUTSIDE];
/** The three ways to close what `open` opened: its «Cancelar», a tap outside, and Back (a second tap outside on iOS). */
function closings(
  open: readonly string[],
  shown: readonly string[],
  unchanged: readonly string[],
): string[][] {
  const start = [...open, ...shown.map(see)];
  const end = [notSee(shown[0] ?? ""), ...unchanged];
  return [
    [...start, tap(CANCEL), ...end],
    [...start, OUTSIDE, ...end],
    [...start, ...ANDROID_BACK, ...IOS_OUTSIDE, ...end],
  ];
}
export function expectClosings(
  all: readonly string[],
  open: readonly string[],
  shown: readonly string[],
  unchanged: readonly string[],
): void {
  expect(flowFiles("us5-")).toContain(SUBS);
  for (const steps of closings(open, shown, unchanged)) {
    run(all, steps);
  }
}
export const ASKS = [
  QUESTION,
  es.grid.subOrStarter.sub,
  es.grid.subOrStarter.starter,
  CANCEL,
];
export const MENU_SHOWN = [MENU.sub, MENU.starter, MENU.remove, CANCEL];
