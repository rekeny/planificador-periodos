// Static checks of the Maestro flow of T078 (US7: keep the squad up to date). Maestro is not run
// here: these tests prove the flow is well formed and agrees with the spec, the Spanish texts and the
// app configuration. What it does step by step is in `us7-journeys.test.ts`, and how it closes the
// keyboard in `us7-keyboard.test.ts`. Running it on both platforms, on Release builds, is the
// orchestrator's step.
import app from "../../app.json";
import {
  flowFiles,
  headerValue,
  idsIn,
  inlineStructures,
  isSpanishText,
  isSystemText,
  isTypedHere,
  literalsOf,
  readFlow,
  specIds,
  withoutWildcards,
} from "../support/e2e-flows";
import { PLAYERS, TEAM_A, TEAM_B } from "../support/us6-scenes";
import { HOME } from "../support/us7-scenes";
import {
  US7_FILE,
  commands7,
  present,
  spec,
  task,
  texts7,
} from "../support/us7-flow";

const name = (): string =>
  present() ? (headerValue(readFlow(US7_FILE), "name") ?? "") : "";
const TASK_IDS = [
  "RF-015",
  "RF-018",
  "RF-019",
  "RF-020",
  "RF-022",
  "RF-023",
  "RF-024",
  "E-018",
];
const NAMES = ["Juan", "Ana", "Bea", "Carla"];

/** A row label merged by iOS («7, Juan») or an alternation of forms (`7|.*7, Juan.*`): each part must be a known text. */
const partsOf = (text: string): string[] =>
  text.split(/\||, /).map(withoutWildcards);

describe("T078 Maestro US7 flow", () => {
  it("RF-018 RF-022: e2e/ holds the US7 flow us7-squad.yaml", () => {
    expect(flowFiles("us7-")).toEqual([US7_FILE]);
  });

  it("RF-018 RF-022: the flow name starts with IDs that are in the spec and in T078", () => {
    expect(present()).toBe(true);
    const lead = /^((?:(?:RF|E)-\d{3} )+)[^ ].*$/.exec(name());
    expect({ named: lead !== null }).toEqual({ named: true });
    const ids = idsIn(lead?.[1] ?? "");
    expect(ids.filter((id) => !specIds(spec).has(id))).toEqual([]);
    expect(ids.filter((id) => !idsIn(task.all).includes(id))).toEqual([]);
  });

  it("RF-015 RF-018 RF-019 RF-020 RF-022 RF-023 RF-024 E-018: the flow name carries every ID of the T078 title", () => {
    expect(idsIn(task.title).sort()).toEqual([...TASK_IDS].sort());
    expect(present()).toBe(true);
    expect(idsIn(name()).sort()).toEqual([...TASK_IDS].sort());
  });

  it("RF-018: only the name of the flow carries IDs, because the traceability script reads every non-comment text (D2 rule 7)", () => {
    expect(present()).toBe(true);
    expect(idsIn(texts7().join("\n"))).toEqual([]);
  });

  it("RF-018: the flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    expect(present()).toBe(true);
    expect(present() && headerValue(readFlow(US7_FILE), "appId")).toBe(
      app.expo.ios.bundleIdentifier,
    );
  });

  it("RF-018 RF-022: every text the flow taps or asserts is in es.json or typed by the flow, alone or as the parts of a merged row label; each cell label names a typed player and a period", () => {
    expect(present()).toBe(true);
    const flow = present() ? readFlow(US7_FILE) : null;
    expect(flow === null ? [] : inlineStructures(flow)).toEqual([]);
    const literals = flow === null ? [] : literalsOf(flow);
    const typed = literals
      .filter((literal) => literal.key === "inputText")
      .map((literal) => literal.value);
    const shown = literals
      .filter((literal) => literal.key !== "inputText")
      .map((literal) => literal.value);
    const known = (text: string): boolean =>
      isSpanishText(text) || isTypedHere(text, typed);
    expect(
      shown.filter((value) => {
        const bare = withoutWildcards(value);
        return !(
          isSpanishText(value) ||
          isSystemText(value) ||
          known(bare) ||
          partsOf(bare).every(known)
        );
      }),
    ).toEqual([]);
    const required = [
      ...NAMES,
      ...PLAYERS,
      TEAM_A,
      TEAM_B,
      ...Object.values(HOME),
      "7",
      "9",
    ];
    expect(typed).toEqual(expect.arrayContaining(required));
    const label = new RegExp(
      `^(?:${NAMES.join("|")}), P[1-8]: (?:casilla vacía|X, titular|X con círculo, entró de cambio)$`,
    );
    const cells = shown.filter((value) => /, P\d+: /.test(value));
    expect(cells.length).toBeGreaterThan(3);
    expect(cells.filter((value) => !label.test(value))).toEqual([]);
  });

  it("RF-018: the flow contains no literal it( or test( call", () => {
    expect(present()).toBe(true);
    expect(present() && readFlow(US7_FILE).text).not.toMatch(/\b(?:it|test)\(/);
  });

  it("RF-018: the flow starts clean once, and if it stops the app it launches it again and waits for the list of teams", () => {
    expect(present()).toBe(true);
    const all = texts7();
    expect(all[0]).toBe("- launchApp:; clearState: true");
    expect(all.filter((line) => /clearState/.test(line))).toHaveLength(1);
    const stops = all.flatMap((line, index) =>
      line === "- stopApp" ? [index] : [],
    );
    for (const index of stops) {
      expect(all[index + 1]).toBe("- launchApp");
      expect(all[index + 2]).toBe('- assertVisible: "Nuevo equipo"');
    }
    expect(all.filter((line) => line.startsWith("- launchApp"))).toHaveLength(
      stops.length + 1,
    );
  });

  it("RF-018: the flow never uses hideKeyboard (on Android, with the keyboard closed, it acts as Back) and no inputText is longer than 170 characters", () => {
    expect(present()).toBe(true);
    const all = texts7();
    expect(all.filter((line) => /hideKeyboard/.test(line))).toEqual([]);
    const typed = all.flatMap((line) => {
      const value = /^- inputText: "(.*)"$/.exec(line)?.[1];
      return value === undefined ? [] : [value];
    });
    expect(typed.length).toBeGreaterThan(15);
    expect(typed.filter((value) => value.length > 170)).toEqual([]);
  });

  it("RF-019 RF-023: the matches are reached through the lists, never with a deep link: no openLink and no scheme", () => {
    expect(present()).toBe(true);
    expect(app.expo.scheme).toBe("planificadorperiodos");
    const all = texts7();
    expect(all.filter((line) => /openLink/.test(line))).toEqual([]);
    expect(all.filter((line) => /planificadorperiodos:/.test(line))).toEqual(
      [],
    );
    expect(all).toContain('- tapOn: "Todos los partidos"');
  });

  it("RF-015 RF-022: Back is pressed only on Android, the sheet swipe and the edge swipe only on iOS, and the only tap by point is the one outside a dialog, at 2%,50%, at least twice (the deactivation and the team)", () => {
    expect(present()).toBe(true);
    const all = commands7();
    const backs = all.filter((c) => c.text === "- back");
    expect(backs.length).toBeGreaterThan(5);
    expect(backs.filter((c) => c.platform !== "Android")).toEqual([]);
    const swipes = all.filter((c) =>
      /^- swipe:; start: (?:50%, 12%|2%)/.test(c.text),
    );
    expect(swipes.filter((c) => c.platform !== "iOS")).toEqual([]);
    const points = all.filter((c) => /^- tapOn:; point:/.test(c.text));
    const outside = points.filter((c) => /point: "?2%, ?50%"?$/.test(c.text));
    expect(outside.length).toBeGreaterThanOrEqual(2);
    expect(points).toEqual(outside);
  });

  it("RF-015 RF-022: a dialog is never closed by a tap on «Cancelar» before a tap outside and, on Android, Back were tried: each question is asserted open after both", () => {
    expect(present()).toBe(true);
    const all = commands7();
    const outsides = all.flatMap((c, index) =>
      /^- tapOn:; point: "?2%, ?50%"?$/.test(c.text) ? [index] : [],
    );
    for (const index of outsides) {
      const next = all.slice(index + 1, index + 5);
      expect(next[0]?.text).toMatch(/^- assertVisible: "¿/);
      expect(
        next.some((c) => c.platform === "Android" && c.text === "- back"),
      ).toBe(true);
    }
  });
});
