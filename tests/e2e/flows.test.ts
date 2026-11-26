// Static checks of the Maestro flows of T036. Maestro itself is not run here (it is not installed
// in this environment): these tests only prove the flows are well formed and agree with the spec,
// the Spanish texts and the app configuration. Running them on a device is the developer's step.
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
  isTypedHere,
  literalsOf,
  readFlow,
  specIds,
  taskText,
  withoutRowPattern,
} from "../support/e2e-flows";

const spec = readFileSync(
  join(FLOW_ROOT, "specs/001-planificador-v1/spec.md"),
  "utf8",
);
const task = taskText(
  readFileSync(join(FLOW_ROOT, "specs/001-planificador-v1/tasks.md"), "utf8"),
  "T036",
);
const FLOWS = ["us1-form-interruption.yaml", "us1-teams-and-players.yaml"];

describe("T036 Maestro flows", () => {
  it("RF-073 RF-082 E-029: e2e/ holds exactly the two US1 flows", () => {
    expect(flowFiles("us1-")).toEqual(FLOWS);
  });

  it("RF-073 RF-082 E-029: every flow name starts with IDs that are in the spec and in T036", () => {
    const valid = specIds(spec);
    const allowed = idsIn(task.all);
    expect(flowFiles("us1-").length).toBeGreaterThan(0);
    for (const file of flowFiles("us1-")) {
      const name = headerValue(readFlow(file), "name") ?? "";
      const lead = /^((?:(?:RF|E)-\d{3} )+)[^ ].*$/.exec(name);
      expect({ file, named: lead !== null }).toEqual({ file, named: true });
      const ids = idsIn(lead?.[1] ?? "");
      expect(ids.filter((id) => !valid.has(id))).toEqual([]);
      expect(ids.filter((id) => !allowed.includes(id))).toEqual([]);
    }
  });

  it("RF-011 RF-013 RF-014 RF-016 RF-017 RF-069 RF-073 RF-082 E-029: together the flow names cover every ID of the T036 title", () => {
    const named = flowFiles("us1-").flatMap((file) =>
      idsIn(headerValue(readFlow(file), "name") ?? ""),
    );
    expect(idsIn(task.title).filter((id) => !named.includes(id))).toEqual([]);
    expect(idsIn(task.title).length).toBeGreaterThan(0);
  });

  it("RF-011 RF-073: every flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    expect(flowFiles("us1-").length).toBeGreaterThan(0);
    for (const file of flowFiles("us1-")) {
      expect(headerValue(readFlow(file), "appId")).toBe(
        app.expo.ios.bundleIdentifier,
      );
    }
  });

  it("RF-013 RF-016 E-022: every text a flow taps or asserts is in es.json or is typed by the flow itself", () => {
    expect(flowFiles("us1-").length).toBeGreaterThan(0);
    for (const file of flowFiles("us1-")) {
      const flow = readFlow(file);
      expect(inlineStructures(flow)).toEqual([]);
      const literals = literalsOf(flow);
      const typed = literals
        .filter((literal) => literal.key === "inputText")
        .map((literal) => literal.value);
      const unknown = literals
        .filter((literal) => literal.key !== "inputText")
        .map((literal) => literal.value)
        .filter(
          (value) =>
            !isSpanishText(value) &&
            !isTypedHere(withoutRowPattern(value), typed),
        );
      expect({ file, unknown }).toEqual({ file, unknown: [] });
    }
  });

  it("RF-082 E-029: the interruption flow stops the app and launches it again without clearing the state", () => {
    const flow = readFlow("us1-form-interruption.yaml");
    const names = flow.commands.map((command) => command.name);
    const firstStop = names.indexOf("stopApp");
    expect(firstStop).toBeGreaterThan(0);
    const launches = flow.commands
      .slice(firstStop)
      .filter((command) => command.name === "launchApp");
    expect(launches.length).toBeGreaterThanOrEqual(3);
    expect(names.indexOf("launchApp", firstStop)).toBe(firstStop + 1);
    expect(
      launches.filter((launch) => /clearState/.test(launch.block)),
    ).toEqual([]);
    expect(
      flow.commands.find((command) => command.name === "launchApp")?.block,
    ).toMatch(/clearState:\s*true/);
  });

  it("RF-013 RF-016 E-022: the journey flow types 41 characters and 3 digits and expects the limits", () => {
    const flow = readFlow("us1-teams-and-players.yaml");
    const literals = literalsOf(flow);
    const long = literals.filter(
      (literal) => literal.key === "inputText" && literal.value.length === 41,
    );
    expect(long.length).toBeGreaterThanOrEqual(3);
    for (const { value } of long) {
      const shown = literals.filter(
        (literal) => literal.value === value.slice(0, 40),
      );
      expect(shown.some((literal) => literal.key === "assertVisible")).toBe(
        true,
      );
      const refused = literals.filter((literal) => literal.value === value);
      expect(
        refused.some((literal) => literal.key === "assertNotVisible"),
      ).toBe(true);
    }
    const typed = literals.filter((literal) => literal.key === "inputText");
    expect(typed.some((literal) => literal.value === "100")).toBe(true);
    expect(
      literals.some((l) => l.key === "assertVisible" && l.value === "10"),
    ).toBe(true);
  });

  it("RF-013 RF-014 RF-016 RF-017 RF-069 RF-073 E-022: the journey flow checks order, the duplicate warning and the messages", () => {
    const literals = literalsOf(readFlow("us1-teams-and-players.yaml"));
    const asserted = literals
      .filter((literal) => literal.key === "assertVisible")
      .map((literal) => literal.value);
    expect(asserted).toEqual(
      expect.arrayContaining([
        "Escribe un nombre.",
        "El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.",
        "Hay jugadores con el mismo dorsal: 7.",
      ]),
    );
    expect(literals.some((l) => l.key === "below")).toBe(true);
  });

  it("RF-082: no flow contains a literal it( or test( call", () => {
    expect(flowFiles("us1-").length).toBeGreaterThan(0);
    for (const file of flowFiles("us1-")) {
      expect(readFlow(file).text).not.toMatch(/\b(?:it|test)\(/);
    }
  });
});
