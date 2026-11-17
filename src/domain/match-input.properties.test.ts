import {
  assert,
  constantFrom,
  integer,
  oneof,
  property,
  string,
  stringMatching,
} from "fast-check";
import { newMatchDefaults, validateMatchInput } from "@/domain/match-input";

// Any text: short, with spaces, digits, accents and any unicode character.
const anyText = oneof(
  string({ unit: "binary", maxLength: 8 }),
  string({ unit: "grapheme", maxLength: 8 }),
  string({
    unit: constantFrom("0", "1", "7", "9", " ", "\t", "\n", "٣", "-", "a"),
    maxLength: 4,
  }),
);

// Up to three digits, or a text that is never a score. Four-digit texts are
// all out of range, so no leading-zero case of four digits is generated.
const scoreText = oneof(
  stringMatching(/^[0-9]{0,3}$/),
  constantFrom("7a", "-1", "1.5", " 7", "7 ", "1000", "9999", "+7", "1e2"),
);

const isWholeScore = (text: string) => /^[0-9]{1,3}$/.test(text);

describe("match input properties", () => {
  it("RF-025: the digits of every integer from 0 to 999, with or without leading zeros up to three digits, are saved as that number", () => {
    assert(
      property(integer({ min: 0, max: 999 }), (value) => {
        for (const typed of [String(value), String(value).padStart(3, "0")]) {
          expect(
            validateMatchInput({
              homeName: null,
              awayName: null,
              notes: null,
              homeScore: typed,
              awayScore: typed,
            }),
          ).toEqual({
            kind: "valid",
            value: {
              homeName: null,
              awayName: null,
              notes: null,
              homeScore: value,
              awayScore: value,
            },
          });
        }
      }),
    );
  });

  it("RF-025: the text of every integer above 999 or below 0 is scoreInvalid", () => {
    assert(
      property(
        oneof(
          integer({ min: 1000, max: 10_000_000 }),
          integer({ min: -10_000_000, max: -1 }),
        ),
        (value) => {
          expect(
            validateMatchInput({
              homeName: null,
              awayName: null,
              notes: null,
              homeScore: String(value),
              awayScore: "0",
            }),
          ).toEqual({ kind: "invalid", errors: ["scoreInvalid"] });
        },
      ),
    );
  });

  it("RF-025: for any two score texts the result is scoreInvalid when one is not a whole score, scoreIncomplete when exactly one is empty, and valid otherwise", () => {
    assert(
      property(scoreText, scoreText, (homeScore, awayScore) => {
        const result = validateMatchInput({
          homeName: null,
          awayName: null,
          notes: null,
          homeScore,
          awayScore,
        });
        const wrong = [homeScore, awayScore].some(
          (text) => text !== "" && !isWholeScore(text),
        );
        if (wrong) {
          expect(result.kind).toBe("invalid");
          if (result.kind === "invalid") {
            expect(result.errors).toContain("scoreInvalid");
            expect(result.errors).not.toContain("scoreIncomplete");
          }
        } else if ((homeScore === "") !== (awayScore === "")) {
          expect(result).toEqual({
            kind: "invalid",
            errors: ["scoreIncomplete"],
          });
        } else {
          expect(result.kind).toBe("valid");
        }
      }),
    );
  });

  it("RF-025: a valid value has names and notes that are null or non-empty and trimmed", () => {
    assert(
      property(anyText, anyText, anyText, scoreText, scoreText, (...texts) => {
        const [homeName, awayName, notes, homeScore, awayScore] = texts;
        const result = validateMatchInput({
          homeName,
          awayName,
          notes,
          homeScore,
          awayScore,
        });
        if (result.kind === "valid") {
          expect(result.value.homeName).toBe(homeName.trim() || null);
          expect(result.value.awayName).toBe(awayName.trim() || null);
          expect(result.value.notes).toBe(notes.trim() || null);
        } else {
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("RF-025: a valid value has both scores null or both whole numbers from 0 to 999", () => {
    assert(
      property(scoreText, scoreText, (homeScore, awayScore) => {
        const result = validateMatchInput({
          homeName: null,
          awayName: null,
          notes: null,
          homeScore,
          awayScore,
        });
        if (result.kind === "valid") {
          const { homeScore: home, awayScore: away } = result.value;
          expect(home === null).toBe(away === null);
          for (const score of [home, away]) {
            expect(score === null || Number.isInteger(score)).toBe(true);
            expect(score === null || (score >= 0 && score <= 999)).toBe(true);
          }
        }
      }),
    );
  });

  it("RF-025: the validator never throws for any text and gives the same result for the same input", () => {
    assert(
      property(anyText, anyText, anyText, anyText, anyText, (...texts) => {
        const [homeName, awayName, notes, homeScore, awayScore] = texts;
        const input = { homeName, awayName, notes, homeScore, awayScore };
        expect(validateMatchInput(input)).toEqual(validateMatchInput(input));
      }),
    );
  });

  it("RF-026 RF-036: for any format and any text of today, the defaults keep the format and the text and have no time", () => {
    assert(
      property(constantFrom(4, 6, 8), anyText, (format, today) => {
        expect(newMatchDefaults(format, today)).toStrictEqual({
          format,
          date: today,
          time: null,
        });
      }),
    );
  });
});
