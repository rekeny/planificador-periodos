// Static checks of the Maestro flow of T060 (US4). Maestro is not installed here and is not run:
// these tests prove the flow is well formed and agrees with the spec, the Spanish texts and the
// app configuration. Running it on both platforms is the developer's step.
import app from "../../app.json";
import {
  flowFiles,
  headerValue,
  idsIn,
  inlineStructures,
  isSpanishText,
  isTypedHere,
  literalsOf,
  readFlow,
  specIds,
  withoutWildcards,
} from "../support/e2e-flows";
import { FLOW, commands, link, spec, task } from "../support/us4-flow";

const name = (): string => headerValue(readFlow(FLOW), "name") ?? "";

describe("T060 Maestro US4 flow", () => {
  it("RF-087: e2e/ holds the one US4 flow", () => {
    expect(flowFiles("us4-")).toEqual([FLOW]);
  });

  it("RF-087 E-001: the flow name starts with IDs that are in the spec and in T060, and together they are every ID of the T060 title", () => {
    const lead = /^((?:(?:RF|E)-\d{3}[ :])+)/.exec(name());
    expect(lead === null).toBe(false);
    const ids = idsIn(lead?.[1] ?? "");
    expect(ids.filter((id) => !specIds(spec).has(id))).toEqual([]);
    expect(ids.filter((id) => !idsIn(task.all).includes(id))).toEqual([]);
    expect(idsIn(task.title)).toHaveLength(14);
    expect(idsIn(task.title).filter((id) => !ids.includes(id))).toEqual([]);
    expect(ids).toEqual(expect.arrayContaining(["E-001", "E-003", "E-009"]));
  });

  it("RF-087: the flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    expect(headerValue(readFlow(FLOW), "appId")).toBe(
      app.expo.ios.bundleIdentifier,
    );
  });

  it("RF-062 RF-065 RF-087: every text the flow taps or asserts is in es.json or typed by the flow, and each cell label names a typed player and a real column", () => {
    const flow = readFlow(FLOW);
    expect(inlineStructures(flow)).toEqual([]);
    const literals = literalsOf(flow);
    const typed = literals
      .filter((literal) => literal.key === "inputText")
      .map((literal) => literal.value);
    const shown = literals
      .filter((literal) => literal.key !== "inputText")
      .map(({ value }) => withoutWildcards(value));
    expect(
      shown.filter(
        (value) => !isSpanishText(value) && !isTypedHere(value, typed),
      ),
    ).toEqual([]);
    const players = typed
      .filter((value) => value !== "Alevín A" && !/^\d+$/.test(value))
      .join("|");
    const label = new RegExp(
      `^(?:${players}), P[1-8]: (?:casilla vacía|X, titular)$`,
    );
    const cells = shown.filter((value) => /, P\d: /.test(value));
    expect(cells.length).toBeGreaterThan(80);
    expect(cells.filter((value) => !label.test(value))).toEqual([]);
  });

  it("RF-087: the flow checks text only: no screenshot command, and no it( or test( call", () => {
    const flow = readFlow(FLOW);
    expect(flow.text).not.toMatch(/\b(?:it|test)\(/);
    expect(commands(FLOW).join("\n")).not.toMatch(/screenshot|color/i);
  });

  it("RF-087: the flow starts clean once and every deep link uses the scheme of app.json", () => {
    expect(app.expo.scheme).toBe("planificadorperiodos");
    const flow = readFlow(FLOW);
    expect(flow.commands[0]?.name).toBe("launchApp");
    expect(flow.commands[0]?.block).toMatch(/clearState:\s*true/);
    expect(
      flow.commands.filter((c) => /clearState/.test(c.block)),
    ).toHaveLength(1);
    const links = flow.commands.filter((c) => c.name === "openLink");
    expect(links).toHaveLength(1);
    expect(flow.text).toContain(link("matches/1"));
  });

  it("RF-060 RF-087: the restart stops the app and launches it again without clearing the state, then opens match 1 with its link", () => {
    const all = commands(FLOW);
    const stops = all.flatMap((line, index) =>
      line === "- stopApp" ? [index] : [],
    );
    expect(stops).toHaveLength(1);
    expect(all[(stops[0] ?? 0) + 1]).toBe("- launchApp");
    expect(all.filter((line) => line.startsWith("- launchApp"))).toHaveLength(
      2,
    );
    expect(all.indexOf(link("matches/1"))).toBeGreaterThan(stops[0] ?? 0);
  });

  it("RF-087: the header describes the manual 100 ms measurement on the 5th-generation iPad, with 12 players and 8 periods, and where its result goes", () => {
    const { text } = readFlow(FLOW);
    expect(text).toMatch(/PERFORMANCE/);
    expect(text).toMatch(/5th-generation iPad/);
    expect(text).toMatch(/100 ms/);
    expect(text).toMatch(/12 players/);
    expect(text).toMatch(/8-period/);
    expect(text).toMatch(/review\.md/);
  });

  it("RF-087: the T060 Pending lists the measurement steps for the developer", () => {
    expect(task.all).toMatch(/Pending: .*5th-generation iPad/);
    expect(task.all).toMatch(/review\.md/);
    expect(task.all).toMatch(/100 ms/);
  });
});
