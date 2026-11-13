// T059: the legend under the general warning (RF-087, E-001, E-007, E-027). Assumed API of
// src/ui/warnings/warning-legend.tsx, which the Implementer writes:
//   WarningLegend({ items: MatchView["legend"] })
// One Text per item, in the order given, with the text of `warning.<item>`, inside a view with
// testID `warning-legend`; no other Text (a swatch has no text); nothing at all when the list is
// empty. The legend never works out which marks are visible: it draws the list it is given.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";

import type { LegendItem } from "@/domain/legend";
import es from "@/i18n/es.json";
import { WarningLegend } from "@/ui/warnings/warning-legend";
import { viewOf } from "../../../tests/support/match-view-grid";
import {
  LEGEND_TEXT,
  legendTexts,
} from "../../../tests/support/warning-reading";
import {
  calmGrid,
  E001,
  E002,
  E003,
  E007,
} from "../../../tests/support/warning-views";

const ALL: readonly LegendItem[] = [
  "lightRedCell",
  "playerInRed",
  "incompletePeriod",
  "inconsistentPeriod",
];

async function legendOf(items: readonly LegendItem[]) {
  await render(<WarningLegend items={items} />);
  return legendTexts();
}

describe("warning legend", () => {
  it.each(ALL)(
    "RF-087: the text of %s lives in es.json under warning.<item>",
    (item) => {
      expect(es).toHaveProperty(`warning.${item}`, LEGEND_TEXT[item]);
    },
  );

  it.each(ALL)(
    "RF-087 E-001: the item %s alone draws exactly its own line",
    async (item) => {
      expect(await legendOf([item])).toEqual([LEGEND_TEXT[item]]);
    },
  );

  it("RF-087 E-027: the view of E-002 draws the light red cell, «!» and «≠» lines in that order and not the player in red", async () => {
    expect(await legendOf(viewOf(E002).legend)).toEqual([
      LEGEND_TEXT.lightRedCell,
      LEGEND_TEXT.incompletePeriod,
      LEGEND_TEXT.inconsistentPeriod,
    ]);
    expect(screen.queryByText(LEGEND_TEXT.playerInRed)).toBeNull();
  });

  it("RF-087 E-001: the view of E-001 explains the light red cell and «!», and never the player in red", async () => {
    expect(await legendOf(viewOf(E001).legend)).toEqual([
      LEGEND_TEXT.lightRedCell,
      LEGEND_TEXT.incompletePeriod,
    ]);
    expect(screen.queryByText(LEGEND_TEXT.playerInRed)).toBeNull();
  });

  it("RF-087 E-007: the view of E-007 has no legend line other than the one of «!»", async () => {
    expect(await legendOf(viewOf(E007).legend)).toEqual([
      LEGEND_TEXT.incompletePeriod,
    ]);
  });

  it("RF-087 E-003: the view of E-003 draws all of the lines of its view in the order of the view, with the player in red", async () => {
    const items = viewOf(E003).legend;
    expect(items).toContain("playerInRed");
    expect(await legendOf(items)).toEqual(items.map((i) => LEGEND_TEXT[i]));
  });

  it("RF-087 RF-061: with no item nothing is drawn, not even an empty frame, and the view of a grid with no warning has no item", async () => {
    expect(viewOf(calmGrid()).legend).toEqual([]);
    await render(<WarningLegend items={viewOf(calmGrid()).legend} />);
    expect(screen.toJSON()).toBeNull();
  });

  it("RF-087: the lines follow the list given, so a line that leaves the list leaves the legend", async () => {
    await render(<WarningLegend items={ALL} />);
    expect(legendTexts()).toHaveLength(4);
    await screen.rerender(<WarningLegend items={["incompletePeriod"]} />);
    expect(legendTexts()).toEqual([LEGEND_TEXT.incompletePeriod]);
  });
});
