// T032: route parameters become a positive integer or null; only the canonical text of a positive
// integer is valid (answer of 2026-11-12). The three parsers share the rule, so each case runs on
// all three. Expected API of src/state/route-params.ts, which the Implementer writes:
//   parseTeamId, parsePlayerId, parseMatchId: (param: string | string[] | undefined) => number | null
import { assert, integer, property, string } from "fast-check";
import { parseMatchId, parsePlayerId, parseTeamId } from "@/state/route-params";

type Param = string | string[] | undefined;
const PARSERS: readonly (readonly [string, (param: Param) => number | null])[] =
  [
    ["parseTeamId", parseTeamId],
    ["parsePlayerId", parsePlayerId],
    ["parseMatchId", parseMatchId],
  ];

function expectAll(param: Param, expected: number | null): void {
  for (const [name, parse] of PARSERS) {
    expect([name, parse(param)]).toEqual([name, expected]);
  }
}

describe("route params", () => {
  it("RF-013 RF-016: the canonical text of a positive integer gives that number", () => {
    expectAll("1", 1);
    expectAll("42", 42);
    expectAll("10", 10);
    expectAll("999", 999);
    expectAll("9007199254740991", Number.MAX_SAFE_INTEGER);
  });

  it("RF-013 RF-016: «abc», «0», «-1», «1.5», «1e3» and the empty text give null", () => {
    for (const param of [
      "abc",
      "0",
      "-1",
      "1.5",
      "1e3",
      "",
      "NaN",
      "Infinity",
      "-0",
    ]) {
      expectAll(param, null);
    }
  });

  it("RF-013 RF-016: «01», «007», «1.0», «+1», « 1», «1 » and a newline or tab around give null", () => {
    for (const param of [
      "01",
      "007",
      "1.0",
      "+1",
      " 1",
      "1 ",
      "1\n",
      "\t1",
      "0x1",
      "1_0",
    ]) {
      expectAll(param, null);
    }
  });

  it("RF-013 RF-016: digits that are not ASCII give null", () => {
    expectAll("٣", null);
    expectAll("７", null);
  });

  it("RF-013 RF-016: a number that is not a safe integer gives null, even when its text round-trips", () => {
    expectAll("9007199254740992", null);
    expectAll("9007199254740993", null);
    expectAll("99999999999999999999", null);
  });

  it("RF-013 RF-016: a missing parameter and a repeated one, as an array, give null", () => {
    expectAll(undefined, null);
    expectAll(["1", "2"], null);
  });

  it("RF-013 RF-016: for every positive safe integer its decimal text gives that integer", () => {
    assert(
      property(integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), (n) => {
        for (const [, parse] of PARSERS) {
          expect(parse(String(n))).toBe(n);
        }
      }),
    );
  });

  it("RF-013 RF-016: for any text the result is null or the number whose decimal text is that text, and it never throws", () => {
    assert(
      property(string(), (text) => {
        for (const [, parse] of PARSERS) {
          const id = parse(text);
          expect(id === null || String(id) === text).toBe(true);
          expect(id === null || id >= 1).toBe(true);
        }
      }),
    );
  });
});
