import { validateMatchInput } from "@/domain/match-input";

const base = {
  homeName: null,
  awayName: null,
  notes: null,
  homeScore: "",
  awayScore: "",
} as const;

const valid = (
  homeName: string | null,
  awayName: string | null,
  notes: string | null,
) => ({
  kind: "valid",
  value: { homeName, awayName, notes, homeScore: null, awayScore: null },
});

describe("validateMatchInput names and notes", () => {
  it("RF-025: a match with nothing typed is valid and every optional value is null", () => {
    expect(validateMatchInput(base)).toEqual(valid(null, null, null));
  });

  it.each([
    [null, null],
    ["", null],
    [" ", null],
    ["   ", null],
    ["\t\n", null],
    ["Ana CB", "Ana CB"],
    [" Ana CB ", "Ana CB"],
    ["\tAna CB\n", "Ana CB"],
    ["Ana  CB", "Ana  CB"],
    ["A", "A"],
    ["D'Angelo 🏀", "D'Angelo 🏀"],
    ["B".repeat(40), "B".repeat(40)],
  ] as const)(
    "RF-025: the home and the away name %j are saved as %j, trimmed at both ends, with inner spaces kept and empty or spaces-only as null",
    (typed, saved) => {
      expect(validateMatchInput({ ...base, homeName: typed })).toEqual(
        valid(saved, null, null),
      );
      expect(validateMatchInput({ ...base, awayName: typed })).toEqual(
        valid(null, saved, null),
      );
    },
  );

  it.each([
    [null, null],
    ["", null],
    [" ", null],
    ["\n \t", null],
    ["Buen partido", "Buen partido"],
    [" Buen partido ", "Buen partido"],
    ["Buen\npartido", "Buen\npartido"],
    ["Buen  partido", "Buen  partido"],
    ["C".repeat(500), "C".repeat(500)],
  ] as const)(
    "RF-025: the notes %j are saved as %j, trimmed at both ends, with inner text kept and empty or spaces-only as null",
    (typed, saved) => {
      expect(validateMatchInput({ ...base, notes: typed })).toEqual(
        valid(null, null, saved),
      );
    },
  );

  it("RF-025: the home and away names and the notes are trimmed independently of each other", () => {
    expect(
      validateMatchInput({
        ...base,
        homeName: "  Local ",
        awayName: " ",
        notes: " nota ",
      }),
    ).toEqual(valid("Local", null, "nota"));
  });

  it("RF-025: the same name for home and away is valid, because the domain blocks nothing else", () => {
    expect(
      validateMatchInput({ ...base, homeName: "Ana CB", awayName: "Ana CB" }),
    ).toEqual(valid("Ana CB", "Ana CB", null));
  });

  it("RF-025: the validator does not modify the input it is given", () => {
    const input = {
      homeName: " Local ",
      awayName: " ",
      notes: " nota ",
      homeScore: "007",
      awayScore: "0",
    };
    validateMatchInput(input);
    expect(input).toEqual({
      homeName: " Local ",
      awayName: " ",
      notes: " nota ",
      homeScore: "007",
      awayScore: "0",
    });
  });

  it("RF-025: a name or notes problem never produces an error, only scores can", () => {
    expect(
      validateMatchInput({
        homeName: "\u0000​",
        awayName: "🏀".repeat(40),
        notes: "'; DROP TABLE matches; --",
        homeScore: "",
        awayScore: "",
      }).kind,
    ).toBe("valid");
  });
});
