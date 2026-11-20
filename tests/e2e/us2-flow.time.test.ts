// Static checks of the time steps of the Maestro flow of T048 (US2), added by T091 (RF-083, E-032,
// E-033). Maestro is not installed here and is not run: these tests prove the flow presses
// «Añadir hora», checks what each platform shows and checks the field again after «Quitar hora».
import es from "@/i18n/es.json";
import { headerValue, idsIn, readFlow, specIds } from "../support/e2e-flows";
import { US2_FILE, flowLiterals, lines, spec } from "../support/us2-flow";

const ADD = `- tapOn: "${es.match.addTime}"`;
const CLEAR = `- tapOn: "${es.match.clearTime}"`;
const FIRST_TIME_SHOWN = '- assertVisible: "18:30"';
const HOUR_18 = '- tapOn: "(?i)18 hours?|18 horas?"';
const MINUTES_30 = '- tapOn: "(?i)30 minutes?|30 minutos?"';

/** The index of the `scrollUntilVisible` that reaches the «Hora» label, the start of the time steps. */
function timeStepsStart(all: readonly string[]): number {
  return all.findIndex(
    (line) =>
      line.startsWith("- scrollUntilVisible") && /text: "Hora"/.test(line),
  );
}

/** The platform of the `runFlow` branch that holds the line, or null at the top level of the flow. */
function branchOf(line: string, occurrence = 0): "iOS" | "Android" | null {
  const raw = readFlow(US2_FILE)
    .text.split("\n")
    .filter((entry) => !/^\s*#/.test(entry));
  const at = raw
    .map((entry, index) => (entry.trim() === line ? index : -1))
    .filter((index) => index !== -1)[occurrence];
  if (at === undefined || !/^\s/.test(raw[at] ?? "")) return null;
  for (let up = at - 1; up >= 0; up -= 1) {
    const platform = /^\s+platform: (iOS|Android)$/.exec(raw[up] ?? "")?.[1];
    if (platform === "iOS" || platform === "Android") return platform;
    if (/^- /.test(raw[up] ?? "")) return null;
  }
  return null;
}

describe("T091 Maestro US2 flow, the time field without a time (RF-083, E-032, E-033)", () => {
  it("RF-083 E-032: on Android the flow opens the date dialog with «Fecha», goes back to March 2026, taps March 1 and closes it with «Aceptar» before asserting 01/03/2026", () => {
    const all = lines();
    const open = '- tapOn: "Fecha"';
    const day = '- tapOn: "(?i).*(march 1, 2026|1 de marzo de 2026).*"';
    const accept = `- tapOn: "${es.common.accept}"`;
    const checked = all.indexOf('- assertVisible: "01/03/2026"');
    expect(all.indexOf(open)).toBeGreaterThan(0);
    expect(all.indexOf(day)).toBeGreaterThan(all.indexOf(open));
    expect(all.indexOf(accept)).toBeGreaterThan(all.indexOf(day));
    expect(checked).toBeGreaterThan(all.indexOf(accept));
    expect(branchOf(open)).toBe("Android");
    expect(branchOf(day)).toBe("Android");
    expect(branchOf('- tapOn: "1"')).toBe("iOS");
    expect(all).not.toContain("- swipe:");
  });

  it("RF-083 E-033: the flow name carries E-033", () => {
    const name = headerValue(readFlow(US2_FILE), "name") ?? "";
    expect(idsIn(name)).toContain("E-033");
    expect(specIds(spec).has("E-033")).toBe(true);
  });

  it("RF-083 E-033: before the time steps the flow checks «Sin hora» and «Añadir hora» visible and «Quitar hora» not visible, then presses «Añadir hora»", () => {
    const all = lines();
    const start = timeStepsStart(all);
    const firstTime = all.indexOf(FIRST_TIME_SHOWN);
    expect(start).toBeGreaterThan(0);
    const steps = [
      `- assertVisible: "${es.match.noTime}"`,
      `- assertVisible: "${es.match.addTime}"`,
      `- assertNotVisible: "${es.match.clearTime}"`,
      ADD,
    ];
    const at = steps.map((step) => all.indexOf(step, start));
    expect(at.every((index) => index > start && index < firstTime)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(all.indexOf(HOUR_18, start)).toBeGreaterThan(at[3] ?? 0);
  });

  it("RF-083 E-033: on iOS the flow asserts «12:00» after «Añadir hora» and before 18:30, and 12:00 is a text the pickers show, not one that is typed", () => {
    const all = lines();
    const twelve = all.indexOf('- assertVisible: "12:00"');
    expect(all.indexOf(ADD)).toBeGreaterThan(0);
    expect(twelve).toBeGreaterThan(all.indexOf(ADD));
    expect(twelve).toBeLessThan(all.indexOf(FIRST_TIME_SHOWN));
    expect(branchOf('- assertVisible: "12:00"')).toBe("iOS");
    expect(
      all.filter((line) => line === '- assertVisible: "12:00"'),
    ).toHaveLength(1);
    expect(
      flowLiterals().filter(
        (l) => l.key === "inputText" && l.value === "12:00",
      ),
    ).toEqual([]);
  });

  it("RF-083 E-033: on iOS the flow does not choose a time on the wheels, only asserts «12:00» (decision of Fernando, 2026-11-20): the wheels are out of Maestro's reach", () => {
    const text = readFlow(US2_FILE)
      .text.split("\n")
      .filter((entry) => !/^\s*#/.test(entry))
      .join("\n");
    expect(text).not.toMatch(/time picker|selector de hora/i);
    // No loop that turns the wheels until the field reads 18 hours or 30 minutes.
    expect(text).not.toMatch(/notVisible: "(?:18:|\.\.:30)/);
    expect(branchOf('- assertVisible: "18:30"')).toBe("Android");
    expect(branchOf(HOUR_18)).toBe("Android");
    expect(branchOf(MINUTES_30)).toBe("Android");
  });

  it("RF-083 E-033: on Android the flow closes the time dialog with «Aceptar» after 18 and 30 and before checking 18:30, never with «Cancelar»", () => {
    const all = lines();
    const accept = `- tapOn: "${es.common.accept}"`;
    const thirty = all.indexOf(MINUTES_30);
    expect(all.indexOf(ADD)).toBeGreaterThan(0);
    expect(thirty).toBeGreaterThan(all.indexOf(ADD));
    expect(all.indexOf(accept, thirty)).toBeGreaterThan(thirty);
    expect(all.indexOf(accept, thirty)).toBeLessThan(
      all.indexOf(FIRST_TIME_SHOWN),
    );
    expect(branchOf(accept)).toBe("Android");
    expect(all).not.toContain(`- tapOn: "${es.common.cancel}"`);
  });

  it("RF-083 E-032 E-033: after «Quitar hora» the flow checks «Sin hora» and «Añadir hora» visible, «Quitar hora» and «18:30» not visible, and the date «01/03/2026» still visible", () => {
    const all = lines();
    const clear = all.indexOf(CLEAR);
    expect(clear).toBeGreaterThan(all.indexOf(FIRST_TIME_SHOWN));
    const after = all.slice(clear + 1, clear + 6);
    expect(after).toEqual(
      expect.arrayContaining([
        `- assertVisible: "${es.match.noTime}"`,
        `- assertVisible: "${es.match.addTime}"`,
        `- assertNotVisible: "${es.match.clearTime}"`,
        '- assertNotVisible: "18:30"',
        '- assertVisible: "01/03/2026"',
      ]),
    );
  });
});
