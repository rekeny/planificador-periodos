import { validatePlayerInput } from "@/domain/squad-validation";

const valid = (name: string, number: string) => ({
  kind: "valid",
  value: { name, number },
});

const invalid = (...errors: string[]) => ({ kind: "invalid", errors });

describe("validatePlayerInput", () => {
  it("RF-016: a player Ana with number 7 is valid and returns the same value", () => {
    expect(validatePlayerInput({ name: "Ana", number: "7" })).toEqual(
      valid("Ana", "7"),
    );
  });

  it.each([
    ["0", "valid"],
    ["00", "valid"],
    ["7", "valid"],
    ["99", "valid"],
    ["9", "valid"],
    ["10", "valid"],
    ["07", "numberInvalid"],
    ["100", "numberInvalid"],
    ["", "numberInvalid"],
    ["01", "numberInvalid"],
    ["000", "numberInvalid"],
    ["0 ", "numberInvalid"],
  ] as const)(
    "RF-016 E-021: the number %j gives %s and is never changed",
    (number, expected) => {
      const result = validatePlayerInput({ name: "Ana", number });
      expect(result).toEqual(
        expected === "valid" ? valid("Ana", number) : invalid(expected),
      );
    },
  );

  it.each([
    ["7a"],
    [" 7"],
    ["7 "],
    ["-1"],
    ["+7"],
    ["7.0"],
    ["1e1"],
    ["٣"],
    ["７"],
    ["1\t0"],
    ["7\n"],
    ["\n7"],
    ["1 0"],
  ])("RF-016: the odd number %j is numberInvalid", (number) => {
    expect(validatePlayerInput({ name: "Ana", number })).toEqual(
      invalid("numberInvalid"),
    );
  });

  it.each([
    ["", "nameRequired"],
    ["   ", "nameRequired"],
    ["\t\n", "nameRequired"],
    ["A", "valid"],
    ["A".repeat(40), "valid"],
    ["Álvaro Núñez", "valid"],
    ["Ana 🏀", "valid"],
  ] as const)("RF-016: the player name %j gives %s", (name, expected) => {
    const result = validatePlayerInput({ name, number: "7" });
    if (expected === "valid") {
      expect(result.kind).toBe("valid");
    } else {
      expect(result).toEqual(invalid(expected));
    }
  });

  it.each([
    [" Ana ", "Ana"],
    ["\tAna\n", "Ana"],
    ["Ana  María", "Ana  María"],
  ] as const)(
    "RF-016: the player name %j is saved as %j, trimmed at both ends",
    (name, expected) => {
      expect(validatePlayerInput({ name, number: "7" })).toEqual(
        valid(expected, "7"),
      );
    },
  );

  it("RF-016 E-021: an empty name with an invalid number gives both errors, name first, every time", () => {
    const expected = invalid("nameRequired", "numberInvalid");
    expect(validatePlayerInput({ name: "", number: "07" })).toEqual(expected);
    expect(validatePlayerInput({ name: "  ", number: "" })).toEqual(expected);
    expect(validatePlayerInput({ name: "", number: "07" })).toEqual(expected);
  });

  it("RF-017: a number already used by another player is never an error, because the validator takes no list of players", () => {
    expect(validatePlayerInput({ name: "Luis", number: "7" }).kind).toBe(
      "valid",
    );
    expect(validatePlayerInput({ name: "Ana", number: "7" }).kind).toBe(
      "valid",
    );
    expect(validatePlayerInput.length).toBe(1);
  });

  it("RF-016: the validator does not modify the input it is given", () => {
    const input = { name: " Ana ", number: "7" };
    validatePlayerInput(input);
    expect(input).toEqual({ name: " Ana ", number: "7" });
  });
});
