// F-E2E-01: on iOS a pressable player row of the team screen is one element, «6, Fran», so a flow that
// looks for the bare name does not find it. The flows use `Name|.*, Name.*`: the bare name (Android)
// or the merged label (iOS). `N|.*N, Name.*` is not used because its first part would also accept the
// number alone on Android.
import { literalsOf, playerRowName, readFlow } from "../support/e2e-flows";

/** The players each flow checks on the team screen, right after saving them or while listing the team. */
const ROW_CHECKS: Record<string, readonly string[]> = {
  "us1-teams-and-players.yaml": ["Eva", "Bea", "Carla", "Luis", "Zoe", "Ana"],
  "us2-match-and-call-up.yaml": ["Luis"],
  "us3-planning.yaml": ["Fran"],
  "us5-subs.yaml": ["Jon"],
  "us5-undo-after-call-up.yaml": ["Fran"],
};

const pattern = (name: string): string => `${name}|.*, ${name}.*`;

describe("F-E2E-01 player rows of the team screen in the Maestro flows", () => {
  it.each([
    ["Fran", "Fran|.*, Fran.*"],
    ["Ana", "Ana|.*, Ana.*"],
  ])("RF-016 RF-076: %s is read from the pattern %s", (name, text) => {
    expect(playerRowName(text)).toBe(name);
  });

  it.each([
    ["the bare name", "Fran"],
    ["the wildcard form of the name", ".*Fran.*"],
    ["a different name in each half", "Fran|.*, Eva.*"],
    ["the number in the first half", "6|.*6, Fran.*"],
    ["no comma", "Fran|.* Fran.*"],
    ["something after the pattern", "Fran|.*, Fran.* extra"],
    ["an empty name", "|.*, .*"],
  ])("RF-016 RF-076: %s is not a player row pattern", (_why, text) => {
    expect(playerRowName(text)).toBeNull();
  });

  it.each(Object.entries(ROW_CHECKS))(
    "RF-016 RF-076: %s checks each player of the team screen with the merged row pattern",
    (file, names) => {
      const shown = literalsOf(readFlow(file))
        .filter((literal) => literal.key !== "inputText")
        .map((literal) => literal.value);
      for (const name of names) {
        expect({ file, name, found: shown.includes(pattern(name)) }).toEqual({
          file,
          name,
          found: true,
        });
      }
    },
  );

  it("RF-016 RF-076: in the US1 flow no check of a player of the team screen is the bare name", () => {
    const shown = literalsOf(readFlow("us1-teams-and-players.yaml"))
      .filter((literal) => literal.key !== "inputText")
      .map((literal) => literal.value);
    for (const name of ROW_CHECKS["us1-teams-and-players.yaml"] ?? []) {
      expect(shown).not.toContain(name);
    }
  });
});
