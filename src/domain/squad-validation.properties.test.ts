import {
  assert,
  constantFrom,
  integer,
  oneof,
  property,
  string,
} from "fast-check";
import {
  validatePlayerInput,
  validateTeamInput,
} from "@/domain/squad-validation";

const VALID_NUMBERS = new Set([
  ...Array.from({ length: 100 }, (_, n) => String(n)),
  "00",
]);

// Any text: short, with spaces, digits, accents and any unicode character.
const anyText = oneof(
  string({ unit: "binary", maxLength: 8 }),
  string({ unit: "grapheme", maxLength: 8 }),
  string({
    unit: constantFrom("0", "1", "7", "9", " ", "\t", "٣", "7", "-"),
    maxLength: 4,
  }),
);

describe("squad validation properties", () => {
  it("RF-016 E-021: the decimal text of every integer from 0 to 99 is a valid number", () => {
    assert(
      property(integer({ min: 0, max: 99 }), (value) => {
        const result = validatePlayerInput({
          name: "Ana",
          number: String(value),
        });
        expect(result).toEqual({
          kind: "valid",
          value: { name: "Ana", number: String(value) },
        });
      }),
    );
  });

  it("RF-016 E-021: every text that is not one of the 101 valid numbers is numberInvalid", () => {
    assert(
      property(
        anyText.filter((text) => !VALID_NUMBERS.has(text)),
        (number) => {
          expect(validatePlayerInput({ name: "Ana", number })).toEqual({
            kind: "invalid",
            errors: ["numberInvalid"],
          });
        },
      ),
    );
  });

  it("RF-013 RF-016: neither validator throws for any text, and each returns a valid value or at least one error", () => {
    assert(
      property(anyText, anyText, (first, second) => {
        for (const result of [
          validatePlayerInput({ name: first, number: second }),
          validateTeamInput({ name: first, category: second }),
          validateTeamInput({ name: first, category: null }),
        ]) {
          if (result.kind === "invalid") {
            expect(result.errors.length).toBeGreaterThan(0);
          } else {
            expect(result.value.name).toBe(result.value.name.trim());
            expect(result.value.name).not.toBe("");
          }
        }
      }),
    );
  });

  it("RF-013: a valid team value is already trimmed, and its category is null or a non-empty trimmed text", () => {
    assert(
      property(anyText, anyText, (name, category) => {
        const result = validateTeamInput({ name, category });
        if (result.kind === "valid") {
          const saved = result.value.category;
          expect(
            saved === null || (saved !== "" && saved === saved.trim()),
          ).toBe(true);
        }
      }),
    );
  });
});
