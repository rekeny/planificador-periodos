// T059: the general warning above the grid (RF-060, RF-067, E-001, E-003, E-004, E-007). Assumed API
// of src/ui/warnings/rule-impossible-banner.tsx, which the Implementer writes (the plan names the
// file but no props, like CallUpRangeBanner, which takes the view field):
//   RuleImpossibleBanner({ ruleImpossible: MatchView["ruleImpossible"] })
// It draws one Text from `warning.ruleImpossible` when true and nothing when false.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";

import es from "@/i18n/es.json";
import { RuleImpossibleBanner } from "@/ui/warnings/rule-impossible-banner";
import { viewOf } from "../../../tests/support/match-view-grid";
import { RULE_IMPOSSIBLE } from "../../../tests/support/warning-reading";
import {
  calmGrid,
  E001,
  E003,
  E007,
  pedroGrid,
} from "../../../tests/support/warning-views";

describe("rule impossible banner", () => {
  it("RF-067: the text lives in es.json as warning.ruleImpossible", () => {
    expect(es).toHaveProperty("warning.ruleImpossible", RULE_IMPOSSIBLE);
  });

  it.each([
    ["E-003", E003],
    ["E-004", pedroGrid(5)],
  ])(
    "RF-067 E-003 E-004: the view of %s shows the general warning text",
    async (_name, grid) => {
      await render(
        <RuleImpossibleBanner ruleImpossible={viewOf(grid).ruleImpossible} />,
      );
      expect(screen.getByText(RULE_IMPOSSIBLE)).toBeOnTheScreen();
    },
  );

  it.each([
    ["E-001", E001],
    ["E-007", E007],
    ["a grid with no warning", calmGrid()],
  ])(
    "RF-067 RF-061 E-001 E-007: the view of %s shows no general warning at all",
    async (_name, grid) => {
      await render(
        <RuleImpossibleBanner ruleImpossible={viewOf(grid).ruleImpossible} />,
      );
      expect(screen.toJSON()).toBeNull();
    },
  );

  it("RF-060: the banner follows the flag, so it appears when it turns true and goes away when it turns false", async () => {
    await render(<RuleImpossibleBanner ruleImpossible={false} />);
    expect(screen.queryByText(RULE_IMPOSSIBLE)).toBeNull();
    await screen.rerender(<RuleImpossibleBanner ruleImpossible />);
    expect(screen.getByText(RULE_IMPOSSIBLE)).toBeOnTheScreen();
    await screen.rerender(<RuleImpossibleBanner ruleImpossible={false} />);
    expect(screen.queryByText(RULE_IMPOSSIBLE)).toBeNull();
  });
});
