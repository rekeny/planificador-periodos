import { validateTeamInput } from "@/domain/squad-validation";

const valid = (name: string, category: string | null) => ({
  kind: "valid",
  value: { name, category },
});

const invalid = (...errors: string[]) => ({ kind: "invalid", errors });

describe("validateTeamInput", () => {
  it("RF-013: a team with name Alevín A and category 2015 is valid and returns the same value", () => {
    expect(validateTeamInput({ name: "Alevín A", category: "2015" })).toEqual(
      valid("Alevín A", "2015"),
    );
  });

  it.each([
    ["", "nameRequired"],
    ["   ", "nameRequired"],
    ["\t\n", "nameRequired"],
    [" \t \n ", "nameRequired"],
    ["Alevín A", "valid"],
    ["A", "valid"],
    ["A".repeat(40), "valid"],
  ] as const)("RF-013: the team name %j gives %s", (name, expected) => {
    const result = validateTeamInput({ name, category: null });
    if (expected === "valid") {
      expect(result.kind).toBe("valid");
    } else {
      expect(result).toEqual(invalid(expected));
    }
  });

  it.each([
    [null, null],
    ["", null],
    ["   ", null],
    ["\t\n", null],
    ["2015", "2015"],
    [" 2015 ", "2015"],
    ["Sub 12", "Sub 12"],
    [" Sub  12 ", "Sub  12"],
    ["B".repeat(40), "B".repeat(40)],
  ] as const)(
    "RF-013: the category %j is saved as %j",
    (category, expected) => {
      expect(validateTeamInput({ name: "Alevín A", category })).toEqual(
        valid("Alevín A", expected),
      );
    },
  );

  it.each([
    [" Alevín A ", "Alevín A"],
    ["\tAlevín A\n", "Alevín A"],
    ["Alevín  A", "Alevín  A"],
    ["Alevín A", "Alevín A"],
    ["D'Angelo 🏀", "D'Angelo 🏀"],
  ] as const)(
    "RF-013: the team name %j is saved as %j, trimmed at both ends and with inner spaces kept",
    (name, expected) => {
      expect(validateTeamInput({ name, category: null })).toEqual(
        valid(expected, null),
      );
    },
  );

  it("RF-013: a name of only spaces is nameRequired and a missing category is never an error", () => {
    expect(validateTeamInput({ name: "   ", category: null })).toEqual(
      invalid("nameRequired"),
    );
    expect(validateTeamInput({ name: "   ", category: "   " })).toEqual(
      invalid("nameRequired"),
    );
    expect(validateTeamInput({ name: "Alevín A", category: null }).kind).toBe(
      "valid",
    );
  });

  it("RF-013: the validator does not modify the input it is given", () => {
    const input = { name: " Alevín A ", category: " 2015 " };
    validateTeamInput(input);
    expect(input).toEqual({ name: " Alevín A ", category: " 2015 " });
  });
});
