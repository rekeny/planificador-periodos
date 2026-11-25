// Static checks of the Maestro flow of T073 (US6: view, edit and delete matches). Maestro is not run
// here: these tests prove the flow is well formed and agrees with the spec, the Spanish texts and the
// app configuration. What it does step by step is in `us6-journeys.test.ts` and `us6-edits.test.ts`.
// Running it on both platforms, on Release builds, is the orchestrator's step.
import app from "../../app.json";
import {
  NATIVE_PICKER_TEXTS,
  PICKED_AND_SHOWN,
  TODAY_VARIABLE,
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
import { PLAYERS } from "../support/us6-scenes";
import {
  US6_FILE,
  flowCommands,
  present,
  spec,
  task,
  texts,
} from "../support/us6-flow";

const name = (): string =>
  present() ? (headerValue(readFlow(US6_FILE), "name") ?? "") : "";
const TASK_IDS = [
  "RF-028",
  "RF-029",
  "RF-039",
  "RF-057",
  "RF-074",
  "RF-075",
  "RF-082",
  "RF-083",
  "E-016",
  "E-032",
];
/** What the lists and the pickers show once a date and a time are chosen: formatted by the app, not in es.json. */
const SHOWN_BY_THE_APP = [
  ...PICKED_AND_SHOWN,
  "01/03/2026 12:00",
  "01/03/2026 18:30",
];

describe("T073 Maestro US6 flow", () => {
  it("RF-074 RF-075: e2e/ holds the US6 flow us6-matches.yaml", () => {
    expect(flowFiles("us6-")).toEqual([US6_FILE]);
  });

  it("RF-028 RF-029: the flow name starts with IDs that are in the spec and in T073", () => {
    expect(present()).toBe(true);
    const lead = /^((?:(?:RF|E)-\d{3} )+)[^ ].*$/.exec(name());
    expect({ named: lead !== null }).toEqual({ named: true });
    const ids = idsIn(lead?.[1] ?? "");
    expect(ids.filter((id) => !specIds(spec).has(id))).toEqual([]);
    expect(ids.filter((id) => !idsIn(task.all).includes(id))).toEqual([]);
  });

  it("RF-028 RF-029 RF-039 RF-057 RF-074 RF-075 RF-082 RF-083 E-016 E-032: the flow name carries every ID of the T073 title", () => {
    expect(idsIn(task.title).sort()).toEqual([...TASK_IDS].sort());
    expect(present()).toBe(true);
    expect(idsIn(name()).sort()).toEqual([...TASK_IDS].sort());
  });

  it("RF-028: only the name of the flow carries IDs, because the traceability script reads every non-comment text (D2 rule 7)", () => {
    expect(present()).toBe(true);
    expect(idsIn(texts().join("\n"))).toEqual([]);
  });

  it("RF-082: the flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    expect(present()).toBe(true);
    expect(present() && headerValue(readFlow(US6_FILE), "appId")).toBe(
      app.expo.ios.bundleIdentifier,
    );
  });

  it("RF-028 RF-074: every text the flow taps or asserts is in es.json, typed by the flow, a native picker text, today's date or a date and time the app formats; each cell label names a typed player and a period of 8", () => {
    expect(present()).toBe(true);
    const flow = present() ? readFlow(US6_FILE) : null;
    expect(flow === null ? [] : inlineStructures(flow)).toEqual([]);
    const literals = flow === null ? [] : literalsOf(flow);
    const typed = literals
      .filter((literal) => literal.key === "inputText")
      .map((literal) => literal.value);
    const shown = literals
      .filter((literal) => literal.key !== "inputText")
      .map((literal) => literal.value);
    expect(
      shown.filter((value) => {
        const bare = withoutWildcards(value);
        return !(
          isSpanishText(value) ||
          isSpanishText(bare) ||
          isSystemText(value) ||
          isTypedHere(bare, typed) ||
          bare === TODAY_VARIABLE ||
          NATIVE_PICKER_TEXTS.includes(value) ||
          SHOWN_BY_THE_APP.includes(bare)
        );
      }),
    ).toEqual([]);
    expect(typed).toEqual(expect.arrayContaining([...PLAYERS]));
    const label = new RegExp(
      `^(?:${PLAYERS.join("|")}), P[1-8]: (?:casilla vacía|X, titular|X con círculo, entró de cambio)$`,
    );
    const cells = shown.filter((value) => /, P\d+: /.test(value));
    expect(cells.length).toBeGreaterThan(10);
    expect(cells.filter((value) => !label.test(value))).toEqual([]);
  });

  it("RF-082: the flow contains no literal it( or test( call", () => {
    expect(present()).toBe(true);
    expect(present() && readFlow(US6_FILE).text).not.toMatch(/\b(?:it|test)\(/);
  });

  it("RF-082 E-019: the flow starts clean once, computes today's date, and stops the app only to launch it again, waiting for the list of teams", () => {
    expect(present()).toBe(true);
    const all = texts();
    expect(all[0]).toBe("- launchApp:; clearState: true");
    expect(all.filter((line) => /clearState/.test(line))).toHaveLength(1);
    expect(all.some((line) => /^- evalScript:.*output\.today/.test(line))).toBe(
      true,
    );
    const stops = all.flatMap((line, index) =>
      line === "- stopApp" ? [index] : [],
    );
    expect(stops.length).toBeGreaterThan(0);
    for (const index of stops) {
      expect(all.slice(index + 1, index + 4)).toEqual([
        "- launchApp",
        '- assertVisible: "Nuevo equipo"',
        '- assertVisible: "Alevín A"',
      ]);
    }
    expect(all.filter((line) => line.startsWith("- launchApp"))).toHaveLength(
      stops.length + 1,
    );
  });

  it("RF-082: the flow never uses hideKeyboard (on Android, with the keyboard closed, it acts as Back) and no inputText is longer than 170 characters", () => {
    expect(present()).toBe(true);
    const all = texts();
    expect(all.filter((line) => /hideKeyboard/.test(line))).toEqual([]);
    const typed = all.flatMap((line) => {
      const value = /^- inputText: "(.*)"$/.exec(line)?.[1];
      return value === undefined ? [] : [value];
    });
    expect(typed.length).toBeGreaterThan(5);
    expect(typed.filter((value) => value.length > 170)).toEqual([]);
  });

  it("RF-074 RF-075: the matches are reached through the lists, never with a deep link: no openLink and no scheme", () => {
    expect(present()).toBe(true);
    expect(app.expo.scheme).toBe("planificadorperiodos");
    const all = texts();
    expect(all.filter((line) => /openLink/.test(line))).toEqual([]);
    expect(all.filter((line) => /planificadorperiodos:/.test(line))).toEqual(
      [],
    );
    expect(all).toContain('- tapOn: "Todos los partidos"');
    expect(all).toContain('- assertVisible: "Partidos"');
  });

  it("RF-029 RF-039: Back is pressed only on Android, the sheet swipe and the edge swipe only on iOS, and a tap outside a dialog is at point 2%,50%", () => {
    expect(present()).toBe(true);
    const all = flowCommands();
    const backs = all.filter((c) => c.text === "- back");
    expect(backs.length).toBeGreaterThan(5);
    expect(backs.filter((c) => c.platform !== "Android")).toEqual([]);
    const swipes = all.filter((c) =>
      /^- swipe:; start: (?:50%, 12%|2%)/.test(c.text),
    );
    expect(swipes.length).toBeGreaterThan(0);
    expect(swipes.filter((c) => c.platform !== "iOS")).toEqual([]);
    const points = all.filter((c) => /^- tapOn:; point:/.test(c.text));
    const outside = points.filter((c) => /point: "?2%, ?50%"?$/.test(c.text));
    // The iOS date popup is closed with a tap near the top, as in the US2 flow; nothing else is tapped by point.
    const popup = points.filter(
      (c) => c.platform === "iOS" && /point: "?50%, ?15%"?$/.test(c.text),
    );
    expect(outside.length).toBeGreaterThanOrEqual(2);
    expect(points.length).toBe(outside.length + popup.length);
  });

  it("RF-083 E-032: the Android picker selectors of the flow match the whole label of the English and the Spanish dialogs (Maestro matches the full text)", () => {
    expect(present()).toBe(true);
    const all = texts();
    const selector = (needle: string): RegExp => {
      const line = all.find((entry) => entry.includes(needle)) ?? "";
      expect({ needle, found: line !== "" }).toEqual({ needle, found: true });
      const pattern = /- tapOn: "\(\?i\)(.+)"/.exec(line)?.[1] ?? "";
      return new RegExp(`^(?:${pattern})$`, "i");
    };
    const labels: [string, string[]][] = [
      [
        "previous month",
        ["Change to previous month", "Cambiar al mes anterior"],
      ],
      [
        "march 1, 2026",
        ["Sunday, March 1, 2026", "domingo, 1 de marzo de 2026"],
      ],
      ["18 hours", ["18 hours", "18 horas"]],
      ["30 minutes", ["30 minutes", "30 minutos"]],
    ];
    for (const [needle, names] of labels) {
      for (const label of names) {
        expect(selector(needle).test(label)).toBe(true);
      }
    }
  });
});
