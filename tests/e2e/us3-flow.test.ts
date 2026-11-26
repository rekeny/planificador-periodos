// Static checks of the Maestro flows of T056 (US3). Maestro is not installed here and is not run:
// these tests prove the flows are well formed and agree with the spec, the Spanish texts and the
// app configuration. Running them on both platforms is the developer's step.
import app from "../../app.json";
import {
  flowFiles,
  headerValue,
  idsIn,
  inlineStructures,
  isSpanishText,
  isOpenLinkQuestion,
  isSystemText,
  isTypedHere,
  literalsOf,
  readFlow,
  specIds,
  withoutRowPattern,
} from "../support/e2e-flows";
import {
  INTERRUPTION,
  PLANNING,
  US3_FILES,
  commands,
  link,
  spec,
  task,
} from "../support/us3-flow";

const names = (file: string): string =>
  headerValue(readFlow(file), "name") ?? "";

describe("T056 Maestro US3 flows", () => {
  it("RF-057 RF-082 E-019: e2e/ holds the two US3 flows", () => {
    expect(flowFiles("us3-")).toEqual(US3_FILES);
  });

  it("RF-057 RF-082 E-017 E-019: every flow name starts with IDs that are in the spec and in T056", () => {
    for (const file of US3_FILES) {
      const lead = /^((?:(?:RF|E)-\d{3} )+)[^ ].*$/.exec(names(file));
      expect({ file, named: lead !== null }).toEqual({ file, named: true });
      const ids = idsIn(lead?.[1] ?? "");
      expect(ids.filter((id) => !specIds(spec).has(id))).toEqual([]);
      expect(ids.filter((id) => !idsIn(task.all).includes(id))).toEqual([]);
    }
  });

  it("RF-034 RF-042 RF-057 RF-058 RF-059 RF-082 E-017 E-019: together the flow names cover every ID of the T056 title", () => {
    const named = US3_FILES.flatMap((file) => idsIn(names(file)));
    expect(idsIn(task.title).filter((id) => !named.includes(id))).toEqual([]);
    expect(idsIn(task.title)).toHaveLength(8);
    expect(idsIn(names(PLANNING))).toEqual(
      expect.arrayContaining(["RF-034", "RF-055", "RF-058", "RF-059", "E-017"]),
    );
    expect(idsIn(names(INTERRUPTION))).toEqual(["RF-057", "RF-082", "E-019"]);
  });

  it("RF-082: every flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    for (const file of US3_FILES) {
      expect(headerValue(readFlow(file), "appId")).toBe(
        app.expo.ios.bundleIdentifier,
      );
    }
  });

  it("RF-042 RF-043: every text a flow taps or asserts is in es.json or typed by the flow, and each cell label names a typed player and a real column", () => {
    for (const file of US3_FILES) {
      const flow = readFlow(file);
      expect(inlineStructures(flow)).toEqual([]);
      const literals = literalsOf(flow);
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
            !isTypedHere(withoutRowPattern(value), typed),
        ),
      }).toEqual({ file, unknown: [] });
      const players = typed.filter((value) => value !== "Alevín A").join("|");
      const label = new RegExp(
        `^(?:${players}), (?:P[1-6]|PR[1-3]): (?:casilla vacía|X, titular|X con círculo, entró de cambio)$`,
      );
      const cells = shown.filter((value) => /, PR?\d: /.test(value));
      expect(cells.length).toBeGreaterThan(10);
      expect(cells.filter((value) => !label.test(value))).toEqual([]);
    }
  });

  it("RF-082: no flow contains a literal it( or test( call", () => {
    for (const file of US3_FILES) {
      expect(readFlow(file).text).not.toMatch(/\b(?:it|test)\(/);
    }
  });

  it("RF-082 E-019: each flow starts clean once and the deep links use the scheme of app.json", () => {
    expect(app.expo.scheme).toBe("planificadorperiodos");
    for (const file of US3_FILES) {
      const flow = readFlow(file);
      expect(flow.commands[0]?.name).toBe("launchApp");
      expect(flow.commands[0]?.block).toMatch(/clearState:\s*true/);
      const clears = flow.commands.filter((c) => /clearState/.test(c.block));
      expect(clears).toHaveLength(1);
      expect(flow.text).toContain(link("matches/1"));
      const links = flow.commands.filter((c) => c.name === "openLink");
      expect(links.length).toBeGreaterThan(0);
      for (const { block } of links) {
        expect(block).toMatch(
          /^- openLink: planificadorperiodos:\/\/matches\//,
        );
      }
    }
  });

  it("RF-082 E-019: every deep link of every flow is followed by the tap on the iOS question «¿Abrir en …?»", () => {
    const linked = flowFiles("us").filter((file) =>
      readFlow(file).text.includes("- openLink:"),
    );
    expect(linked.length).toBeGreaterThan(0);
    for (const file of linked) {
      const lines = readFlow(file)
        .text.split("\n")
        .filter((line) => !/^\s*#/.test(line));
      const links = lines.flatMap((line, index) =>
        line.startsWith("- openLink:") ? [index] : [],
      );
      const asked = links.filter((index) =>
        isOpenLinkQuestion(lines.slice(index + 1, index + 6).join("\n")),
      );
      expect({ file, asked }).toEqual({ file, asked: links });
    }
  });

  it("RF-057 RF-082 E-019: the interruption flow stops the app and launches it again, without clearing the state, at least five times", () => {
    const all = commands(INTERRUPTION);
    const stops = all.flatMap((line, index) =>
      line === "- stopApp" ? [index] : [],
    );
    expect(stops.length).toBeGreaterThanOrEqual(5);
    for (const index of stops) {
      expect(all[index + 1]).toBe("- launchApp");
    }
    expect(all.filter((line) => line.startsWith("- launchApp"))).toHaveLength(
      stops.length + 1,
    );
  });

  it("RF-057: the planning flow never stops the app: leaving the match is done with Back and the deep link", () => {
    const all = commands(PLANNING);
    expect(all).not.toContain("- stopApp");
    expect(all.filter((line) => line.startsWith("- launchApp"))).toHaveLength(
      1,
    );
  });
});
