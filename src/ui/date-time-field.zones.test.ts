// F-02: toLocalTime returns every time of the day unchanged in any time zone. A test cannot change
// the zone of its own process (the zone is read when the process starts), so each zone runs in a
// child Node process started with `TZ` set, over the real source file of the helpers transpiled to
// JavaScript. The zone each child really used is read back from `Intl` and checked.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const SOURCE = readFileSync(
  join(__dirname, "date-time-field-shared.ts"),
  "utf8",
);
const HELPERS = ts.transpileModule(SOURCE, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const PROGRAM = `
const exports = {};
${HELPERS}
const wrong = [];
for (let hour = 0; hour < 24; hour += 1) {
  for (let minute = 0; minute < 60; minute += 1) {
    const time = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
    const picked = exports.toLocalTime(time);
    if (picked.getHours() !== hour || picked.getMinutes() !== minute) wrong.push(time);
  }
}
const noon = exports.toLocalTime(null);
console.log(JSON.stringify({
  zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  wrong,
  noon: [noon.getHours(), noon.getMinutes()],
  shifted: exports.toLocalDate("2026-03-29", "02:30").getHours(),
}));
`;

interface Reading {
  readonly zone: string;
  readonly wrong: string[];
  readonly noon: number[];
  readonly shifted: number;
}

function inZone(zone: string): Reading {
  const run = spawnSync(process.execPath, ["-e", PROGRAM], {
    env: { ...process.env, TZ: zone },
    encoding: "utf8",
  });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout) as Reading;
}

// The hour a time of 02:30 on 29 March 2026 has once built as a local Date: 3 where the clocks go
// forward that day (Spain), 2 elsewhere.
const ZONES: [string, number][] = [
  ["Europe/Madrid", 3],
  ["America/New_York", 2],
  ["Australia/Sydney", 2],
  ["Australia/Lord_Howe", 2],
  ["UTC", 2],
];

describe("toLocalTime in other time zones (F-02, RF-083)", () => {
  it.each(ZONES)(
    "RF-083 F-02: in %s (the child process really uses it) every time from 00:00 to 23:59 comes back unchanged and the noon fallback is 12:00",
    (zone, shifted) => {
      const reading = inZone(zone);
      expect(reading.zone).toBe(zone);
      expect(reading.wrong).toEqual([]);
      expect(reading.noon).toEqual([12, 0]);
      // The reason toLocalTime exists: the Date of the match's day is shifted in Spain only.
      expect(reading.shifted).toBe(shifted);
    },
  );

  it("RF-083 F-02: the tests of this suite run in Europe/Madrid, so the daylight-saving regressions are the same on any machine", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      "Europe/Madrid",
    );
    expect(new Date(2026, 2, 29, 2, 30).getHours()).toBe(3);
  });
});
