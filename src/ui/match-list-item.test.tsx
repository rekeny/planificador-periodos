// T071: MatchListItem, one match in a list of matches (RF-074, RF-075, RF-083, E-023). Props
// { item, onPress }: `item` is a `MatchListItem` of src/state/matches-store.ts, whose date and time
// are already formatted, and `onPress` takes no argument that these tests read. The item is one
// button; its Texts are the date, the time (if any), the home and away names joined with
// `matches.item.sides`, the score (if any, its own Text, joined with `matches.item.score`), the
// format with `format.option` and, in the list of every match, the team's name and category (if
// any), each in its own Text with one line. The date and the time may share a Text. The component
// name follows the file name, as NoTime does; `@/ui/match-list-item` does not exist yet.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { MatchListItem as Item } from "@/state/matches-store";
import { MatchListItem } from "@/ui/match-list-item";

const FULL: Item = {
  id: 7,
  date: "15/11/2026",
  time: "18:30",
  homeName: "Alevín A",
  awayName: "Cadete B",
  score: { home: 72, away: 65 },
  format: 6,
  team: { name: "Club Águilas", category: "2015" },
};

const texts = (): string[] =>
  screen
    .queryAllByText(/.*/)
    .map((node) => [node.props.children].flat().join(""));

async function show(item: Item, onPress = jest.fn()): Promise<jest.Mock> {
  await render(<MatchListItem item={item} onPress={onPress} />);
  return onPress;
}

describe("MatchListItem, what it shows", () => {
  it("RF-074 RF-083 E-023: a match with everything shows its date, time, «Alevín A – Cadete B», «72–65», «6 periodos» and, each in its own Text, the team's name and category, and nothing else", async () => {
    await show(FULL);
    const shown = texts();
    expect(shown.join(" ")).toContain("15/11/2026");
    expect(shown.join(" ")).toContain("18:30");
    expect(shown).toContain("Alevín A – Cadete B");
    expect(shown).toContain("72–65");
    expect(shown).toContain("6 periodos");
    expect(shown).toContain("Club Águilas");
    expect(shown).toContain("2015");
    const rest = [
      "15/11/2026",
      "18:30",
      "Alevín A – Cadete B",
      "72–65",
      "6 periodos",
      "Club Águilas",
      "2015",
    ].reduce((left, piece) => left.replace(piece, ""), shown.join("|"));
    expect(rest).toMatch(/^[\s|·,\-–—]*$/);
  });

  it.each([4, 6, 8] as const)(
    "RF-074: the format %i is shown as «%i periodos»",
    async (format) => {
      await show({ ...FULL, format });
      expect(texts()).toContain(`${format} periodos`);
    },
  );

  it("RF-083 E-023: the date comes already formatted and is shown as given, «01/03/2026»", async () => {
    await show({ ...FULL, date: "01/03/2026" });
    expect(texts().join(" ")).toContain("01/03/2026");
  });

  it("RF-074: a match without a time shows no time and no empty time text", async () => {
    await show({ ...FULL, time: null });
    expect(texts().join(" ")).not.toMatch(/\d{2}:\d{2}/);
    expect(texts().filter((text) => text.trim() === "")).toEqual([]);
  });

  it("RF-074: a match without a score shows no score and no empty score text", async () => {
    await show({ ...FULL, score: null });
    expect(texts().some((text) => /^\d+–\d+$/.test(text))).toBe(false);
    expect(texts().filter((text) => text.trim() === "")).toEqual([]);
  });

  it.each([
    [{ home: 0, away: 0 }, "0–0"],
    [{ home: 0, away: 7 }, "0–7"],
    [{ home: 999, away: 0 }, "999–0"],
  ])(
    "RF-074: the score %j is shown as «%s», a zero is a score and not a missing one",
    async (score, expected) => {
      await show({ ...FULL, score });
      expect(texts()).toContain(expected);
    },
  );

  it.each([
    [null, "Cadete B", "Local – Cadete B"],
    ["Alevín A", null, "Alevín A – Visitante"],
    [null, null, "Local – Visitante"],
  ])(
    "RF-074: home %j and away %j are shown as «%s»",
    async (homeName, awayName, expected) => {
      await show({ ...FULL, homeName, awayName });
      expect(texts()).toContain(expected);
    },
  );

  it("RF-074: a team with a category shows the name and the category each in its own one-line Text", async () => {
    await show(FULL);
    expect(screen.getByText("Club Águilas").props.numberOfLines).toBe(1);
    expect(screen.getByText("2015").props.numberOfLines).toBe(1);
  });

  it.each([null, ""])(
    "RF-074: a team whose category is %j shows only its name, and no empty line",
    async (category) => {
      await show({ ...FULL, team: { name: "Club Águilas", category } });
      expect(texts()).toContain("Club Águilas");
      expect(texts().filter((text) => text.trim() === "")).toEqual([]);
      expect(texts().join(" ")).not.toContain("null");
    },
  );

  it("RF-075: an item without a team (a team's own list) shows neither a name nor a category", async () => {
    await show({ ...FULL, team: null });
    expect(texts().join("|")).not.toContain("Club Águilas");
    expect(texts().join("|")).not.toContain("2015");
    expect(texts()).toContain("Alevín A – Cadete B");
  });
});

describe("MatchListItem, long names", () => {
  const LONG = "Club Baloncesto Alevín Aragón Zaragoza Femenino 2015 A";

  it("RF-074: a long team name and category are whole in a Text of one line, so the system cuts them with an ellipsis", async () => {
    await show({ ...FULL, team: { name: LONG, category: LONG } });
    const [name, category] = screen.getAllByText(LONG);
    expect(name?.props.numberOfLines).toBe(1);
    expect(category?.props.numberOfLines).toBe(1);
    expect(name?.props.ellipsizeMode ?? "tail").toBe("tail");
  });

  it("RF-074: long home and away names stay whole in one Text that is cut by a line limit, never pushing the rest off", async () => {
    await show({ ...FULL, homeName: LONG, awayName: LONG });
    const sides = screen.getByText(`${LONG} – ${LONG}`);
    expect(sides.props.numberOfLines).toBeGreaterThanOrEqual(1);
    expect(sides.props.ellipsizeMode ?? "tail").toBe("tail");
  });

  it("RF-074: 40-character names are shown whole", async () => {
    const forty = "Club Baloncesto Alevín Aragón Zaragoza 1";
    await show({
      ...FULL,
      homeName: forty,
      team: { name: forty, category: null },
    });
    expect(forty).toHaveLength(40);
    expect(texts().filter((text) => text.includes(forty)).length).toBe(2);
  });
});

describe("MatchListItem, pressing it", () => {
  it("RF-074: the item is one button, and each press calls onPress once, rendering never", async () => {
    const onPress = await show(FULL);
    expect(onPress).toHaveBeenCalledTimes(0);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText("Alevín A – Cadete B"));
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
