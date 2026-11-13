// Steps of the match screen tests with the grid (T055). This file holds no test calls. It adds to
// call-up-screen.ts, match-session-marks.ts and match-grid-reading.ts without changing them.
// Assumed screen (`/matches/<id>`, src/app/matches/[matchId]/index.tsx):
//   - the grid of T083: every cell is a button named by `grid.cell.*` ("Jugador 1, P1: casilla
//     vacía"), the headers are Texts "P1".., "PR1".., the counters "J 1 · D 5";
//   - three buttons «Deshacer», «Añadir prórroga» and «Quitar prórroga» (the last one only while
//     the match has an overtime): in the native header (`headerRight`) when the window is a tablet,
//     else in a toolbar placed after the grid cells in the tree;
//   - the confirmation of T045 (a `Modal`) for the removal of an overtime with marks, with the
//     texts of spec.md: «¿Quitar la prórroga {{number}}?», «Tiene marcas y se borrarán.» and the
//     confirm button «Quitar prórroga» (the same name as the toolbar button, so it is read inside
//     the Modal), where `number` is the number of the overtime removed (the last one);
//   - `error.saveFailed` as a Text while the store's `saveFailed` is true.
// Jest has no native header: a header button is a host element under "RNSScreenStackHeaderConfig".
import { fireEvent, screen, within } from "expo-router/testing-library";

import { cellAt, type SeedMark } from "./match-session-marks";
import { squadSpecs, writeMark } from "./match-session-fixtures";
import type { SessionOptions } from "./match-session-fixtures";
import { openMatchScreen, startSession } from "./call-up-screen";

export const UNDO = "Deshacer";
export const ADD = "Añadir prórroga";
export const REMOVE_OVERTIME = "Quitar prórroga";
export const PHONE = { width: 375, height: 667 };
export const TABLET = { width: 1024, height: 768 };

/** A match of `count` players with marks already saved, opened on the match screen. */
export async function openPlan(
  count: number,
  seeds: readonly SeedMark[] = [],
  options: SessionOptions = {},
) {
  const s = startSession(squadSpecs(count), [], options);
  for (const [row, key, mark] of seeds) {
    const { column } = cellAt(0, key);
    const kind = column.kind === "period" ? "P" : "OT";
    writeMark(s.db, s.entryIds[row] ?? 0, kind, column.number, mark);
  }
  await openMatchScreen(s.matchId);
  return s;
}

/** The button of a player's cell in a column ("P1", "PR2"); its label tells the state. */
export function cellButton(player: string, column: string) {
  return screen.getByRole("button", {
    name: new RegExp(`^${player}, ${column}: `),
  });
}

export function cellState(
  player: string,
  column: string,
): "empty" | "starter" | "sub" {
  const label = String(cellButton(player, column).props.accessibilityLabel);
  if (label.endsWith("casilla vacía")) return "empty";
  return label.includes("con círculo") ? "sub" : "starter";
}

export async function tap(player: string, column: string): Promise<void> {
  await fireEvent.press(cellButton(player, column));
}

/** Every cell of the grid, in the tree order. */
export function cellButtons() {
  return screen.queryAllByRole("button", { name: /, (P|PR)\d+: / });
}

/** The column headers drawn, in order: ["P1", …, "PR1"]. */
export function columnTitles(): string[] {
  return screen
    .queryAllByText(/^PR?\d+$/)
    .map((node) => String(node.props.children));
}

/** The buttons with exactly that name (zero, one, or two when a dialog repeats the name). */
export function buttonsNamed(name: string) {
  return screen.queryAllByRole("button", { name });
}

export function pressButton(name: string): Promise<void> {
  const [button] = buttonsNamed(name);
  if (button === undefined) throw new Error(`No button «${name}»`);
  return fireEvent.press(button);
}

/** Whether the element lives in the native header of its screen. */
export function inHeader(element: ReturnType<typeof cellButton>): boolean {
  let node = element.parent;
  while (node !== null) {
    if (node.type === "RNSScreenStackHeaderConfig") return true;
    node = node.parent;
  }
  return false;
}

/** Whether the element comes after every cell of the grid in the tree (a toolbar under the grid). */
export function afterGrid(element: ReturnType<typeof cellButton>): boolean {
  const all = screen.getAllByRole("button");
  const lastCell = cellButtons().at(-1);
  if (lastCell === undefined) throw new Error("The grid has no cells");
  return all.indexOf(element) > all.indexOf(lastCell);
}

function modalHost() {
  const [modal] = screen.container.queryAll((node) => node.type === "Modal");
  if (modal === undefined) throw new Error("No dialog is open");
  return modal;
}

/** The confirmation of the overtime removal, read inside its Modal. */
export function dialogTexts(): string[] {
  const modal = within(modalHost());
  return modal
    .queryAllByText(/./)
    .map((node) => String(node.props.children))
    .filter((text) => text !== "");
}

export async function confirmRemoval(): Promise<void> {
  await fireEvent.press(
    within(modalHost()).getByRole("button", { name: REMOVE_OVERTIME }),
  );
}

export function dialogOpen(): boolean {
  return screen.queryByRole("button", { name: "Cancelar" }) !== null;
}
