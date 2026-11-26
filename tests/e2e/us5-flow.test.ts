// Static checks of the Maestro flows of T066 (US5: subs, the long-press menu, E-026 and E-027).
// Maestro is not run here: these tests prove the flows are well formed and agree with the spec, the
// Spanish texts and the app configuration. What each flow does step by step is in
// `us5-journeys.test.ts`. Running them on both platforms is the orchestrator's step.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import app from "../../app.json";
import {
  FLOW_ROOT,
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
  taskText,
  withoutRowPattern,
} from "../support/e2e-flows";
import { commands, link } from "../support/us3-flow";
import { OPTION_PREFIX } from "../support/us5-flow";

const SUBS = "us5-subs.yaml";
const UNDO_FLOW = "us5-undo-after-call-up.yaml";
const US5_FILES = [SUBS, UNDO_FLOW];
const specs = join(FLOW_ROOT, "specs/001-planificador-v1");
const spec = readFileSync(join(specs, "spec.md"), "utf8");
const task = taskText(readFileSync(join(specs, "tasks.md"), "utf8"), "T066");
const present = (file: string): boolean => flowFiles("us5-").includes(file);
const nameOf = (file: string): string =>
  present(file) ? (headerValue(readFlow(file), "name") ?? "") : "";
const linesOf = (file: string): string[] =>
  present(file) ? commands(file) : [];
const ANDROID = "- runFlow:; when:; platform: Android; commands:";
const IOS = "- runFlow:; when:; platform: iOS; commands:";

describe("T066 Maestro US5 flows", () => {
  it("RF-045 RF-057 RF-086 E-011 E-026: e2e/ holds the two US5 flows", () => {
    expect(flowFiles("us5-")).toEqual(US5_FILES);
  });

  it("RF-045 RF-057 RF-086 E-011 E-026: every flow name starts with IDs that are in the spec and in T066", () => {
    for (const file of US5_FILES) {
      const lead = /^((?:(?:RF|E)-\d{3} )+)[^ ].*$/.exec(nameOf(file));
      expect({ file, named: lead !== null }).toEqual({ file, named: true });
      const ids = idsIn(lead?.[1] ?? "");
      expect(ids.filter((id) => !specIds(spec).has(id))).toEqual([]);
      expect(ids.filter((id) => !idsIn(task.all).includes(id))).toEqual([]);
    }
  });

  it("RF-045 RF-046 RF-047 RF-048 RF-050 RF-051 RF-052 RF-053 RF-054 RF-055 RF-057 RF-066 RF-086 RF-087 E-011 E-012 E-013 E-026 E-027: together the flow names cover every ID of the T066 title", () => {
    const named = US5_FILES.flatMap((file) => idsIn(nameOf(file)));
    expect(idsIn(task.title).filter((id) => !named.includes(id))).toEqual([]);
    expect(idsIn(task.title)).toHaveLength(19);
    expect(idsIn(nameOf(SUBS))).toEqual(
      expect.arrayContaining(["RF-045", "RF-052", "RF-087", "E-013", "E-027"]),
    );
    expect(idsIn(nameOf(UNDO_FLOW))).toEqual(
      expect.arrayContaining(["RF-057", "RF-086", "E-026"]),
    );
  });

  it("RF-045: only the name of a flow carries IDs, because the traceability script reads every non-comment text (D2 rule 7)", () => {
    for (const file of US5_FILES) {
      expect(present(file)).toBe(true);
      const body = present(file)
        ? readFlow(file)
            .commands.map((command) => command.block)
            .join("\n")
        : "";
      expect({ file, ids: idsIn(body) }).toEqual({ file, ids: [] });
    }
  });

  it("RF-045: every flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    for (const file of US5_FILES) {
      expect(present(file)).toBe(true);
      expect(present(file) && headerValue(readFlow(file), "appId")).toBe(
        app.expo.ios.bundleIdentifier,
      );
    }
  });

  it("RF-045 RF-052: every text a flow taps or asserts is in es.json or typed by the flow, and every cell label, also the one of a long press, names a typed player and a real column", () => {
    for (const file of US5_FILES) {
      expect(present(file)).toBe(true);
      const flow = present(file) ? readFlow(file) : null;
      const literals = flow === null ? [] : literalsOf(flow);
      expect(flow === null ? [] : inlineStructures(flow)).toEqual([]);
      const typed = literals
        .filter((literal) => literal.key === "inputText")
        .map((literal) => literal.value);
      const shown = literals
        .filter((literal) => literal.key !== "inputText")
        .map((literal) => literal.value);
      expect({
        file,
        unknown: shown.filter(
          (value) =>
            !isSpanishText(value) &&
            !isSystemText(value) &&
            !isTypedHere(
              withoutRowPattern(value.replace(OPTION_PREFIX, "")),
              typed,
            ),
        ),
      }).toEqual({ file, unknown: [] });
      const players = typed.filter((value) => value !== "Alevín A").join("|");
      const label = new RegExp(
        `^(?:${players}), P[1-6]: (?:casilla vacía|X, titular|X con círculo, entró de cambio)$`,
      );
      const pressed = linesOf(file)
        .filter((line) => line.startsWith("- longPressOn:"))
        .map((line) => /^- longPressOn: "(.*)"$/.exec(line)?.[1] ?? line);
      const cells = [
        ...shown.filter((value) => /, P\d: /.test(value)),
        ...pressed,
      ];
      expect(cells.length).toBeGreaterThan(10);
      expect(cells.filter((value) => !label.test(value))).toEqual([]);
    }
  });

  it("RF-045: no flow contains a literal it( or test( call", () => {
    for (const file of US5_FILES) {
      expect(present(file)).toBe(true);
      expect(present(file) && readFlow(file).text).not.toMatch(
        /\b(?:it|test)\(/,
      );
    }
  });

  it("RF-052 E-019: a flow starts clean once, never uses hideKeyboard and stops the app only to launch it again", () => {
    for (const file of US5_FILES) {
      const all = linesOf(file);
      expect(all[0]).toBe("- launchApp:; clearState: true");
      expect(all.filter((line) => /clearState/.test(line))).toHaveLength(1);
      expect(all.filter((line) => /hideKeyboard/.test(line))).toEqual([]);
      const stops = all.flatMap((line, index) =>
        line === "- stopApp" ? [index] : [],
      );
      expect(stops.length).toBeGreaterThan(0);
      for (const index of stops) {
        expect(all[index + 1]).toBe("- launchApp");
      }
      expect(all.filter((line) => line.startsWith("- launchApp"))).toHaveLength(
        stops.length + 1,
      );
    }
  });

  it("RF-082 E-019: the matches are opened with the deep link, only after the list of teams has been seen following each launch (F-A3)", () => {
    expect(app.expo.scheme).toBe("planificadorperiodos");
    for (const file of US5_FILES) {
      const all = linesOf(file);
      expect(all.filter((line) => line === link("matches/1")).length).toBe(
        all.filter((line) => line.startsWith("- openLink:")).length,
      );
      const relaunches = all.flatMap((line, index) =>
        line === "- launchApp" ? [index] : [],
      );
      expect(relaunches.length).toBeGreaterThan(0);
      for (const index of relaunches) {
        expect(all.slice(index + 1, index + 4)).toEqual([
          '- assertVisible: "Nuevo equipo"',
          '- assertVisible: "Alevín A"',
          link("matches/1"),
        ]);
      }
    }
  });

  it("RF-050 RF-052: Back is pressed only on Android and the edge swipe of iOS only on iOS, each inside the runFlow of its platform", () => {
    for (const file of US5_FILES) {
      const all = linesOf(file);
      const backs = all.flatMap((line, index) =>
        line === "- back" ? [index] : [],
      );
      expect(backs.length).toBeGreaterThan(0);
      for (const index of backs) {
        expect(all[index - 1]).toBe(ANDROID);
      }
      const edge = all.flatMap((line, index) =>
        line.startsWith("- swipe:; start: 2%") ? [index] : [],
      );
      for (const index of edge) {
        expect(all[index - 1]).toBe(IOS);
      }
    }
  });
});
