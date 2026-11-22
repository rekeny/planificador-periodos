// Steps of the match screen tests with the question dialog (T064). This file holds no test calls. It
// adds to match-screen-grid.ts and match-session-questions.ts without changing them. Assumed
// screen: ONE question dialog on the match screen (a `Modal`, drawn only while a question is
// pending, with its content following `pending`), with the texts of the spec's table.
import { fireEvent, screen, within } from "expo-router/testing-library";

import type { SeedMark } from "./match-session-marks";
import { FULL_P2, P3_WITH_SUB } from "./match-session-questions";
import { openPlan, tap } from "./match-screen-grid";

export const QUESTION = "¿Entra de cambio o es titular en lugar de otro?";
export const SUB = "Entra de cambio";
export const STARTER = "Titular en lugar de otro";
export const CHOICE = "¿A quién sustituye como titular?";
export const REMINDER =
  "Si ha salido por un cambio, déjala marcada: sigue contando como jugado";
export const REMOVE_ANYWAY = "Quitar de todos modos";

/** The host `Modal`s drawn now: a closed dialog draws none. */
export const hosts = () =>
  screen.container.queryAll((node) => node.type === "Modal");

/** The dialog's own contents: the grid behind it has the same names, so they are read inside. */
export function dialog() {
  const [host] = hosts();
  if (host === undefined) throw new Error("No dialog is open");
  return within(host);
}

export function press(label: string | RegExp): Promise<void> {
  return fireEvent.press(dialog().getByRole("button", { name: label }));
}

/** Where each question comes from: the grid, the tap that opens it and what the dialog shows. */
export interface Kind {
  readonly name: string;
  readonly seeds: readonly SeedMark[];
  readonly cell: readonly [player: string, column: string];
  readonly steps: readonly string[];
  readonly title: string;
  readonly buttons: number;
}

export const ASKS: Kind = {
  name: "the question",
  seeds: FULL_P2,
  cell: ["Jugador 1", "P2"],
  steps: [],
  title: QUESTION,
  buttons: 3,
};
export const CHOOSES: Kind = {
  name: "the choice of the replaced X",
  seeds: FULL_P2,
  cell: ["Jugador 1", "P2"],
  steps: [STARTER],
  title: CHOICE,
  buttons: 6,
};
export const REMINDS: Kind = {
  name: "the reminder",
  seeds: P3_WITH_SUB,
  cell: ["Jugador 5", "P3"],
  steps: [],
  title: REMINDER,
  buttons: 2,
};

export const KINDS: readonly Kind[] = [ASKS, CHOOSES, REMINDS];

/** A match of 9 players with the grid of the kind, opened, the tap done and its steps pressed. */
export async function openKind(
  kind: Kind,
  options: { overtimeCount?: number } = {},
) {
  const s = await openPlan(9, kind.seeds, options);
  await tap(...kind.cell);
  for (const step of kind.steps) await press(step);
  return s;
}
