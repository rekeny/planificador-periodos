// What the warning tests of T059 read from a rendered grid. This file holds no test calls.
// Assumed drawing, named here once (the Implementer follows it; the accessible labels of the cells,
// the header titles «P1» and the counters stay as T054/T083 fixed them):
//   - colours: `src/ui/theme/warning-colors.ts` exports two strings, `LIGHT_RED` and `RED`. A light
//     red cell is the cell's own pressable (role button) with `backgroundColor: LIGHT_RED` in its
//     flattened style; a player in red is the Text of the player's name with `color: RED`. Any other
//     cell or name has neither colour (nothing is coloured by default, RF-061).
//   - header marks: a Text with testID `column-mark-<ColumnKey>` («column-mark-P3», «column-mark-OT1»)
//     whose only child is «!» or «≠» (from `grid.header.incompleteMark` / `inconsistentMark`), drawn
//     next to the title Text «P3», which stays its own Text. A column with no mark has no such Text.
//   - general warning: a Text with the text of `warning.ruleImpossible`, above the grid. The view that
//     holds it and the call-up range banner has testID `warning-banners` (present whenever one of
//     the two banners is drawn) and gets `onLayout` for `bannersHeight`.
//   - legend: a view with testID `warning-legend` under the general warning, with `onLayout` for
//     `legendHeight`, holding exactly one Text per legend item with the text of `warning.<item>` and
//     no other Text (a swatch, if any, has no text). With nothing to explain it is not drawn.
import { screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { LegendItem } from "@/domain/legend";
import { LIGHT_RED, RED } from "@/ui/theme/warning-colors";

export const RULE_IMPOSSIBLE =
  "Con las casillas vacías que quedan en el tramo ya no se puede cumplir la regla para todos.";

export const LEGEND_TEXT: Record<LegendItem, string> = {
  lightRedCell: "Si la marcas, no descansará el mínimo del tramo.",
  playerInRed: "No cumple la regla del tramo.",
  incompletePeriod: "Periodo incompleto: tiene menos de 5 titulares.",
  inconsistentPeriod:
    "Periodo incoherente: hay un cambio pero menos de 5 titulares. ¿Has quitado la X de quien salió?",
};

export const BANNERS = "warning-banners";
export const LEGEND = "warning-legend";
const MARK_PREFIX = "column-mark-";

type Node = ReturnType<typeof screen.getByTestId>;

function flat(node: Node): Record<string, unknown> {
  return (StyleSheet.flatten(node.props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

export const backgroundOf = (node: Node): unknown => flat(node).backgroundColor;
export const colourOf = (node: Node): unknown => flat(node).color;

/** The labels of the cells with the light red background, as «Jugador 1, P4», sorted. */
export function lightRedCells(): string[] {
  return screen
    .queryAllByRole("button", { name: /, (P|PR)\d+: / })
    .filter((cell) => backgroundOf(cell) === LIGHT_RED)
    .map((cell) => String(cell.props.accessibilityLabel).split(": ")[0] ?? "")
    .sort();
}

/** The names, among the texts «Jugador n», drawn with the red colour, sorted. */
export function redPlayers(): string[] {
  return screen
    .queryAllByText(/^Jugador \d+$/)
    .filter((name) => colourOf(name) === RED)
    .map((name) => String(name.props.children))
    .sort();
}

/** The mark of every column that has one: { P1: "!", P3: "≠" }. */
export function headerMarks(): Record<string, string> {
  const marks: Record<string, string> = {};
  for (const mark of screen.queryAllByTestId(new RegExp(`^${MARK_PREFIX}`))) {
    marks[String(mark.props.testID).slice(MARK_PREFIX.length)] = String(
      mark.props.children,
    );
  }
  return marks;
}

/** The Texts of the legend, in order; empty when the legend is not drawn. */
export function legendTexts(): string[] {
  const legend = screen.queryByTestId(LEGEND);
  if (legend === null) return [];
  return within(legend)
    .queryAllByText(/./)
    .map((text) => String(text.props.children));
}

export function generalWarningShown(): boolean {
  return screen.queryByText(RULE_IMPOSSIBLE) !== null;
}

/** Everything the warnings draw on the grid, as plain data to compare. */
export function warningsDrawn() {
  return {
    lightRed: lightRedCells(),
    inRed: redPlayers(),
    marks: headerMarks(),
    general: generalWarningShown(),
    legend: legendTexts(),
  };
}

/** Where a text starts in the drawn tree: a smaller number is earlier (above) in the screen. */
export function positionOf(text: string): number {
  const at = JSON.stringify(screen.toJSON()).indexOf(JSON.stringify(text));
  if (at < 0) throw new Error(`«${text}» is not drawn`);
  return at;
}
