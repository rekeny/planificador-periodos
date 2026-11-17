// What the US4 flow does, step by step (T060), read from the file without running it.
import {
  FLOW,
  IMPOSSIBLE,
  INCOMPLETE,
  IN_RED,
  LIGHT_RED,
  NO_IMPOSSIBLE,
  NO_INCONSISTENT,
  NO_IN_RED,
  NO_LIGHT_RED,
  UNDO,
  cell,
  commands,
  inOrder,
  link,
  mark,
  marks,
  matchSection,
  see,
  tap,
  tapsOf,
} from "../support/us4-flow";

const all = commands(FLOW);
const section = (n: number): string[] => matchSection(all, n);
const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"];
const perPeriod = (lines: string[]): number[] =>
  PERIODS.map((p) =>
    Object.values(tapsOf(lines, p)).reduce((a, b) => a + b, 0),
  );
/** How many cells each player marks in P1 to P5. */
function perPlayer(lines: string[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const period of PERIODS.slice(0, 5)) {
    for (const [who, taps] of Object.entries(tapsOf(lines, period))) {
      total[who] = (total[who] ?? 0) + taps;
    }
  }
  return total;
}
const ONLY_P5 = [
  mark("assertVisible", { rightOf: "P4", leftOf: "P6" }),
  mark("assertNotVisible", { leftOf: "P5" }),
  mark("assertNotVisible", { rightOf: "P5" }),
];
const juan = (period: string): string => tap(cell("Juan", period, "empty"));
const juanX = (period: string): string => see(cell("Juan", period, "starter"));

describe("T060 Maestro US4 journeys: the warnings and the legend by text", () => {
  it("RF-062 RF-065 RF-087 E-001: with 10 players and Juan's X in P1, P2 and P3 the legend explains the light red cell and «!», no player in red, no general warning, «!» on P1 to P5", () => {
    const lines = section(1);
    expect(lines).toContain(see("10 convocados"));
    inOrder(lines, [
      ...marks("P1", ["Juan"]),
      ...marks("P2", ["Juan"]),
      ...marks("P3", ["Juan"]),
      juanX("P3"),
      [
        LIGHT_RED,
        INCOMPLETE,
        NO_IN_RED,
        NO_IMPOSSIBLE,
        NO_INCONSISTENT,
        mark("assertVisible", { leftOf: "P2" }),
        mark("assertVisible", { rightOf: "P4", leftOf: "P6" }),
        mark("assertNotVisible", { rightOf: "P5" }),
      ],
    ]);
  });

  it("RF-060 RF-063 RF-067 E-003: a fourth X is accepted and Juan in red, P5 light red and the general warning appear", () => {
    inOrder(section(1), [
      juan("P4"),
      juanX("P4"),
      [LIGHT_RED, IN_RED, IMPOSSIBLE],
    ]);
  });

  it("RF-060 RF-087: the light red line goes when the last light red cell is filled, and comes back with «Deshacer» and with a tap on the X", () => {
    inOrder(section(1), [
      juan("P5"),
      [NO_LIGHT_RED, IN_RED, IMPOSSIBLE],
      UNDO,
      [see(cell("Juan", "P5", "empty")), LIGHT_RED],
      juan("P5"),
      NO_LIGHT_RED,
      tap(cell("Juan", "P5", "starter")),
      [see(cell("Juan", "P5", "empty")), LIGHT_RED, IN_RED, IMPOSSIBLE],
    ]);
  });

  it("RF-067 RF-065 E-006: P1 to P4 with 5 X and P5 with 4 X, Pedro and Luis once each and not in P5, show the general warning and «!» on P5 only", () => {
    const lines = section(2);
    expect(perPeriod(lines)).toEqual([5, 5, 5, 5, 4, 0]);
    for (const player of ["Pedro", "Luis"]) {
      expect(perPlayer(lines)[player]).toBe(1);
      expect(tapsOf(lines, "P5")[player]).toBeUndefined();
    }
    inOrder(lines, [
      IMPOSSIBLE,
      ONLY_P5[0] ?? "",
      ONLY_P5[1] ?? "",
      INCOMPLETE,
    ]);
  });

  it("RF-062 RF-065 RF-087 E-007: 10 players with two X each in P1 to P4, P5 and P6 empty: only «!» on P5, a legend with that line alone and no general warning", () => {
    const lines = section(3);
    expect(lines).toContain(see("10 convocados"));
    expect(perPeriod(lines)).toEqual([5, 5, 5, 5, 0, 0]);
    expect(Object.values(perPlayer(lines))).toEqual(Array(10).fill(2));
    inOrder(lines, [
      [
        ...ONLY_P5,
        INCOMPLETE,
        NO_LIGHT_RED,
        NO_IN_RED,
        NO_INCONSISTENT,
        NO_IMPOSSIBLE,
      ],
    ]);
  });

  it("RF-064 RF-065 RF-067 E-005: with 12 players, Pedro's single X and P5 with 3 X, Pedro is not in red, there is no light red cell and no general warning, only «!» on P5", () => {
    const lines = section(4);
    expect(lines).toContain(see("12 convocados"));
    expect(perPeriod(lines)).toEqual([5, 5, 5, 5, 3, 0]);
    expect(tapsOf(lines, "P1")["Pedro"]).toBe(1);
    const totals = perPlayer(lines);
    expect(Object.keys(totals)).toHaveLength(12);
    for (const [name, count] of Object.entries(totals)) {
      expect({ name, count }).toEqual({
        name,
        count: name === "Pedro" ? 1 : 2,
      });
    }
    inOrder(lines, [
      [...ONLY_P5, INCOMPLETE, NO_IN_RED, NO_LIGHT_RED, NO_IMPOSSIBLE],
    ]);
  });

  it("RF-006 RF-062 RF-065 RF-072 E-008: in 8 periods Juan's four X give the light red line and «!» up to P6, and marks in P7 and P8 add no line and no «!»", () => {
    const lines = section(5);
    expect(lines).toContain(tap("8 periodos"));
    inOrder(lines, [
      juan("P1"),
      juan("P2"),
      juan("P3"),
      juan("P4"),
      juanX("P4"),
      [
        LIGHT_RED,
        INCOMPLETE,
        NO_IN_RED,
        NO_IMPOSSIBLE,
        mark("assertVisible", { rightOf: "P5", leftOf: "P7" }),
        mark("assertNotVisible", { rightOf: "P6" }),
      ],
      juan("P7"),
      tap(cell("Bea", "P8", "empty")),
      see(cell("Bea", "P8", "starter")),
      [
        LIGHT_RED,
        NO_IN_RED,
        NO_IMPOSSIBLE,
        mark("assertNotVisible", { rightOf: "P6" }),
      ],
    ]);
  });

  it("RF-006 RF-062 RF-065 E-009: in 4 periods Juan's two X give the light red line and «!» up to P3, and a mark in P4 adds no line and no «!»", () => {
    const lines = section(6);
    expect(lines).toContain(tap("4 periodos"));
    inOrder(lines, [
      juan("P1"),
      juan("P2"),
      juanX("P2"),
      [
        LIGHT_RED,
        INCOMPLETE,
        NO_IN_RED,
        NO_IMPOSSIBLE,
        mark("assertVisible", { rightOf: "P2", leftOf: "P4" }),
        mark("assertNotVisible", { rightOf: "P3" }),
      ],
      juan("P4"),
      juanX("P4"),
      [LIGHT_RED, NO_IN_RED, mark("assertNotVisible", { rightOf: "P3" })],
    ]);
  });

  it("RF-060 RF-087 E-003: after the app is closed and opened again, match 1 shows the same warnings, recomputed from its saved marks", () => {
    const steps = [
      "- launchApp",
      see("Nuevo equipo"),
      link("matches/1"),
      [
        juanX("P4"),
        see(cell("Juan", "P5", "empty")),
        LIGHT_RED,
        IN_RED,
        IMPOSSIBLE,
        INCOMPLETE,
        NO_INCONSISTENT,
        mark("assertVisible", { leftOf: "P2" }),
        mark("assertVisible", { rightOf: "P4", leftOf: "P6" }),
        mark("assertNotVisible", { rightOf: "P5" }),
      ],
    ];
    inOrder(all, steps, all.indexOf("- stopApp"));
  });
});
