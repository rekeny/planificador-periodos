// Static checks of the Maestro flow of T048 (US2). Maestro is not installed here and is not run:
// these tests prove the flow is well formed and agrees with the spec, the Spanish texts and the
// app configuration. Running it on both platforms is the developer's step.
import app from "../../app.json";
import es from "@/i18n/es.json";
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
  withoutRowPattern,
} from "../support/e2e-flows";
import {
  US2_FILE,
  spec,
  task,
  flowLiterals,
  lines,
  range,
  typedTexts,
  visible,
} from "../support/us2-flow";

describe("T048 Maestro US2 flow", () => {
  it("RF-030 RF-036 RF-084 E-024: e2e/ holds the US2 flow us2-match-and-call-up.yaml", () => {
    expect(flowFiles("us2-")).toEqual([US2_FILE]);
  });

  it("RF-030 RF-036 RF-084 E-024: the flow name starts with IDs that are in the spec and in T048", () => {
    const name = headerValue(readFlow(US2_FILE), "name") ?? "";
    const lead = /^((?:(?:RF|E)-\d{3} )+)[^ ].*$/.exec(name);
    expect({ named: lead !== null }).toEqual({ named: true });
    const ids = idsIn(lead?.[1] ?? "");
    expect(ids.filter((id) => !specIds(spec).has(id))).toEqual([]);
    expect(ids.filter((id) => !idsIn(task.all).includes(id))).toEqual([]);
  });

  it("RF-030 RF-031 RF-033 RF-035 RF-036 RF-037 RF-068 RF-083 RF-084 E-015 E-023 E-024 E-032: the flow name covers every ID of the T048 title", () => {
    const named = idsIn(headerValue(readFlow(US2_FILE), "name") ?? "");
    expect(idsIn(task.title).filter((id) => !named.includes(id))).toEqual([]);
    expect(idsIn(task.title)).toHaveLength(13);
  });

  it("RF-083: the flow targets the app id of app.json on iOS and Android", () => {
    expect(app.expo.ios.bundleIdentifier).toBe(app.expo.android.package);
    expect(headerValue(readFlow(US2_FILE), "appId")).toBe(
      app.expo.ios.bundleIdentifier,
    );
  });

  it("RF-068 E-022: every text the flow taps or asserts is in es.json, typed by the flow, a native picker text or today's date", () => {
    const flow = readFlow(US2_FILE);
    expect(inlineStructures(flow)).toEqual([]);
    const literals = literalsOf(flow);
    const typed = typedTexts();
    const unknown = literals
      .filter((literal) => literal.key !== "inputText")
      .map((literal) => literal.value)
      .filter(
        (value) =>
          !isSpanishText(value) &&
          !isSystemText(value) &&
          !isTypedHere(withoutRowPattern(value), typed) &&
          value !== TODAY_VARIABLE &&
          !NATIVE_PICKER_TEXTS.includes(value) &&
          !PICKED_AND_SHOWN.includes(value),
      );
    expect(unknown).toEqual([]);
    for (const text of NATIVE_PICKER_TEXTS) {
      expect(literals).toContainEqual({ key: "tapOn", value: text });
    }
  });

  it("RF-082: the flow contains no literal it( or test( call", () => {
    expect(readFlow(US2_FILE).text).not.toMatch(/\b(?:it|test)\(/);
  });

  it("RF-036 E-023: the flow starts clean, computes today's date and asserts it in the form", () => {
    const flow = readFlow(US2_FILE);
    expect(flow.commands[0]?.block).toMatch(/clearState:\s*true/);
    expect(flow.text).toMatch(/evalScript:.*output\.today/);
    expect(visible()).toContain(TODAY_VARIABLE);
  });

  it("RF-083 E-032: the pickers are the real native ones on both platforms: no date or time is typed", () => {
    const text = readFlow(US2_FILE).text;
    expect(text).toMatch(/platform: iOS/);
    expect(text).toMatch(/platform: Android/);
    const typed = flowLiterals().filter((l) => l.key === "inputText");
    expect(
      typed.filter(
        (l) => /^\d{1,2}[/:]\d{2}/.test(l.value) || l.value === "2026",
      ),
    ).toEqual([]);
    expect(visible()).toEqual(expect.arrayContaining(["01/03/2026", "18:30"]));
  });

  it("RF-083 E-032: «Quitar hora» removes the time, keeps the date and the flow carries on without it", () => {
    const all = lines();
    const clear = all.indexOf(`- tapOn: "${es.match.clearTime}"`);
    expect(clear).toBeGreaterThan(0);
    // T091 adds the checks of «Sin hora» and «Añadir hora» after these two (see us2-flow.time.test.ts).
    const next = all.slice(clear + 1, clear + 6);
    expect(next).toContain('- assertNotVisible: "18:30"');
    expect(next).toContain('- assertVisible: "01/03/2026"');
    expect(all.indexOf('- assertVisible: "18:30"')).toBeLessThan(clear);
  });

  it("RF-084 E-024: the format is changed in the form to 8 periods with no dialog, and the next match shows the team default of 6", () => {
    const all = lines();
    const change = all.indexOf('- tapOn: "8 periodos"');
    expect(change).toBeGreaterThan(0);
    expect(all[change + 1]).toBe(`- assertNotVisible: "${es.common.cancel}"`);
    expect(visible()).toContain(range(8, 6, 9));
    expect(all).toContain(`- assertNotVisible: "${range(12, 8, 8)}"`);
  });

  it("RF-010 RF-068 E-015: with 8 players the form and the match both show the range warning and «Guardar» still creates the match", () => {
    const all = lines();
    const form = all.indexOf(`- assertVisible: "${range(8)}"`);
    expect(form).toBeGreaterThan(0);
    expect(all.slice(form + 1)).toContain('- tapOn: "Guardar"');
    const saved = all.indexOf('- tapOn: "Guardar"', form);
    expect(
      all.indexOf(`- assertVisible: "${range(8)}"`, saved),
    ).toBeGreaterThan(saved);
    expect(visible()).toEqual(
      expect.arrayContaining(["12 convocados", "8 convocados"]),
    );
  });

  it("RF-010 RF-068 E-030: with 13 players the warning is shown in the form and in the match, which is created", () => {
    const all = lines();
    const form = all.indexOf(`- assertVisible: "${range(13)}"`);
    const saved = all.indexOf('- tapOn: "Guardar"', form);
    expect(form).toBeGreaterThan(0);
    expect(saved).toBeGreaterThan(form);
    expect(
      all.indexOf(`- assertVisible: "${range(13)}"`, saved),
    ).toBeGreaterThan(saved);
    expect(visible()).toContain("13 convocados");
  });

  it("RF-030 RF-031 RF-068 E-015: 12 players give no warning and a team with no active players creates a match with an empty call-up", () => {
    const all = lines();
    expect(all).toContain(`- assertNotVisible: "${range(12)}"`);
    expect(visible()).toEqual(
      expect.arrayContaining([
        "0 convocados",
        range(0),
        es.callUp.addEmpty,
        es.callUp.createPlayer,
      ]),
    );
    expect(
      all.indexOf(
        '- tapOn: "Guardar"',
        all.indexOf(`- assertVisible: "${range(0)}"`),
      ),
    ).toBeGreaterThan(0);
  });

  it("RF-031 RF-033 RF-035: the flow creates a player from the match and removes and adds another with no confirmation", () => {
    const all = lines();
    expect(all).toContain(`- tapOn: "${es.callUp.createPlayer}"`);
    // The second remove button (Fran), not the first: the first sits under the iOS header strip.
    expect(flowLiterals()).toContainEqual({
      key: "text",
      value: es.callUp.remove,
    });
    expect(lines().join("\n")).toMatch(
      new RegExp(`text: "${es.callUp.remove}"\\s+index: 1`),
    );
    expect(all).toContain(
      `- assertNotVisible: "${es.confirm.removeFromCallUp.title.replace("{{name}}", "Fran")}"`,
    );
    expect(
      all.filter((line) => line === '- tapOn: "Nuevo jugador"'),
    ).toHaveLength(12);
    const typed = flowLiterals().filter((l) => l.key === "inputText");
    expect(typed).toContainEqual({ key: "inputText", value: "Nora" });
  });

  it("RF-033: a player with marks is not removed here (T056): the flow never confirms a removal", () => {
    const literals = flowLiterals();
    expect(literals).not.toContainEqual({
      key: "tapOn",
      value: es.confirm.removeFromCallUp.confirm,
    });
    expect(literals).not.toContainEqual({
      key: "tapOn",
      value: es.common.cancel,
    });
  });

  it("RF-036: Back from the grid goes to the team and the new-match form is not shown (P-30)", () => {
    const text = readFlow(US2_FILE).text;
    expect(text).toMatch(/platform: Android\n\s+commands:\n\s+- back\n/);
    const texts = flowLiterals().map((l) => `${l.key}:${l.value}`);
    const at = texts.findIndex(
      (entry, index) =>
        entry === `assertVisible:${es.matches.new}` &&
        texts[index + 1] === `assertNotVisible:${es.common.save}`,
    );
    expect(at).toBeGreaterThan(0);
  });

  it("RF-082: the app is stopped with the form half-filled and the deep link of match 1 shows not-found, so none was created", () => {
    const flow = readFlow(US2_FILE);
    const all = lines();
    const link = all.indexOf("- openLink: planificadorperiodos://matches/1");
    expect(link).toBeGreaterThan(0);
    expect(all[link + 1]).toBe(`- assertVisible: "${es.notFound.message}"`);
    const opened = all.lastIndexOf(`- tapOn: "${es.matches.new}"`, link);
    expect(all.slice(opened, link)).toEqual(
      expect.arrayContaining(["- stopApp", "- launchApp"]),
    );
    expect(all.slice(opened, link)).not.toContain('- tapOn: "Guardar"');
    const launches = flow.commands.filter((c) => c.name === "launchApp");
    expect(launches.filter((c) => /clearState/.test(c.block))).toHaveLength(1);
    expect(all.indexOf('- assertNotVisible: "Rivales"')).toBeGreaterThan(link);
  });

  it("RF-025 E-022: the flow types 41 characters, 501 characters and a fourth digit and expects each field to keep its limit", () => {
    const literals = flowLiterals();
    // The home name (41), the notes (501) and a score of four digits (limit 3).
    const shapes = [
      { limit: 40, fits: (value: string) => value.length === 41 },
      { limit: 500, fits: (value: string) => value.length === 501 },
      { limit: 3, fits: (value: string) => /^\d{4}$/.test(value) },
    ];
    const typed_ = typedTexts();
    for (const { limit, fits } of shapes) {
      const typed = typed_.filter(fits).map((value) => ({ value }));
      expect(typed.length).toBeGreaterThan(0);
      for (const { value } of typed) {
        expect(literals).toContainEqual({
          key: "assertVisible",
          value: value.slice(0, limit),
        });
        expect(literals).toContainEqual({ key: "assertNotVisible", value });
      }
    }
  });

  it("RF-025 E-024: one score only shows the message, the second score hides it, and the quick option writes the team name that is then edited", () => {
    const all = lines();
    const message = `${es.validation.scoreIncomplete}`;
    const shown = all.indexOf(`- assertVisible: "${message}"`);
    expect(shown).toBeGreaterThan(0);
    expect(all.indexOf(`- assertNotVisible: "${message}"`)).toBeGreaterThan(
      shown,
    );
    const quick = all.indexOf(`- tapOn: "${es.match.quickHome}"`);
    expect(quick).toBeGreaterThan(0);
    expect(all.slice(quick + 1, quick + 5)).toEqual([
      '- assertVisible: "Alevín A"',
      '- tapOn: "Alevín A"',
      "- eraseText",
      expect.stringMatching(/^- inputText: /),
    ]);
  });
});
