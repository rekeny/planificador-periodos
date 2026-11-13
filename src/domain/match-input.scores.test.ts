import { validateMatchInput } from "@/domain/match-input";

const withScores = (homeScore: string, awayScore: string) =>
  validateMatchInput({
    homeName: null,
    awayName: null,
    notes: null,
    homeScore,
    awayScore,
  });

const scores = (homeScore: number | null, awayScore: number | null) => ({
  kind: "valid",
  value: { homeName: null, awayName: null, notes: null, homeScore, awayScore },
});

const invalid = (...errors: string[]) => ({ kind: "invalid", errors });

describe("validateMatchInput scores", () => {
  it.each([
    ["", "", null, null],
    ["0", "0", 0, 0],
    ["999", "0", 999, 0],
    ["0", "999", 0, 999],
    ["999", "999", 999, 999],
    ["7", "12", 7, 12],
    ["007", "0", 7, 0],
    ["000", "010", 0, 10],
    ["00", "01", 0, 1],
  ] as const)(
    "RF-025: the scores %j and %j are valid and saved as the numbers %j and %j, never as text",
    (home, away, savedHome, savedAway) => {
      expect(withScores(home, away)).toEqual(scores(savedHome, savedAway));
    },
  );

  it.each([
    ["0", ""],
    ["", "0"],
    ["7", ""],
    ["", "7"],
    ["999", ""],
    ["", "999"],
  ] as const)(
    "RF-025: only one score typed, %j and %j, is scoreIncomplete, and 0 counts as a value, not as empty",
    (home, away) => {
      expect(withScores(home, away)).toEqual(invalid("scoreIncomplete"));
    },
  );

  it.each([
    "7a",
    "a7",
    "abc",
    "-1",
    "-0",
    "+7",
    "1.5",
    "1,5",
    "1e2",
    "0x10",
    " 7",
    "7 ",
    "1 2",
    "1000",
    "9999",
    "12345",
    "٣",
    "🏀",
  ])(
    "RF-025: the score text %j is not a whole number from 0 to 999 and gives scoreInvalid, on either side",
    (typed) => {
      expect(withScores(typed, "0")).toEqual(invalid("scoreInvalid"));
      expect(withScores("0", typed)).toEqual(invalid("scoreInvalid"));
    },
  );

  it.each(["7a", "-1", "1.5", " 7", "1000"])(
    "RF-025: the invalid score %j with the other side empty gives only scoreInvalid, because the incomplete check looks only at valid scores",
    (typed) => {
      expect(withScores(typed, "")).toEqual(invalid("scoreInvalid"));
      expect(withScores("", typed)).toEqual(invalid("scoreInvalid"));
    },
  );

  it("RF-025: two invalid scores give scoreInvalid and never scoreIncomplete", () => {
    const result = withScores("7a", "-1");
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.errors).toContain("scoreInvalid");
      expect(result.errors).not.toContain("scoreIncomplete");
    }
  });

  it("RF-025: an invalid score does not hide the names and notes, which are still never an error", () => {
    expect(
      validateMatchInput({
        homeName: " Local ",
        awayName: null,
        notes: null,
        homeScore: "1000",
        awayScore: "1",
      }),
    ).toEqual(invalid("scoreInvalid"));
  });

  it("RF-025: a score of 999 against 0 is valid, because the domain blocks nothing else", () => {
    expect(withScores("999", "0").kind).toBe("valid");
  });
});
