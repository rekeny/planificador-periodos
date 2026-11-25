/// <reference types="node" />
// T072 (phase 4 review M-1): the match screen was at the 60-line limit of a function before it gained
// «Editar», so its header buttons and its body buttons moved out to `MatchHeaderButtons` and
// `MatchBodyActions`. ESLint enforces the limit; this test pins the structure that makes it hold, as
// match-grid.source.test.ts does for the grid: the three functions exist where the task puts them,
// each under 60 lines (as ESLint counts: no blank lines, no comments), the screen uses the two new
// components, and the form takes the read-only store type of T095, so the details draft fits it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

const SCREEN = "src/app/matches/[matchId]/index.tsx";
const HEADER = "src/ui/grid/match-header-buttons.tsx";
const BODY = "src/ui/grid/match-body-actions.tsx";
const DETAILS = "src/app/matches/[matchId]/edit.tsx";
const FORM = "src/ui/match-form.tsx";

/** The lines of `function name` as ESLint's max-lines-per-function counts them (no blanks, no comments). */
function functionLines(file: string, name: string): number {
  const lines = read(file).split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`\\bfunction ${name}\\b`).test(line),
  );
  if (start < 0) throw new Error(`No function ${name} in ${file}`);
  const end = lines.findIndex((line, index) => index > start && line === "}");
  return lines
    .slice(start, end + 1)
    .filter((line) => !/^\s*(\/\/.*)?$/.test(line)).length;
}

describe("match screen source, the 60-line limit and the new pieces (T072)", () => {
  it.each([
    [SCREEN, "MatchScreen"],
    [HEADER, "MatchHeaderButtons"],
    [BODY, "MatchBodyActions"],
  ])("RF-076: %s has the function %s, under 60 lines", (file, name) => {
    expect(existsSync(join(ROOT, file))).toBe(true);
    expect(functionLines(file, name)).toBeLessThan(60);
  });

  it("RF-076: the match screen draws the header buttons and the body actions through MatchHeaderButtons and MatchBodyActions", () => {
    const source = read(SCREEN);
    expect(source).toMatch(/\bMatchHeaderButtons\b/);
    expect(source).toMatch(/\bMatchBodyActions\b/);
    expect(read(HEADER)).toMatch(/export function MatchHeaderButtons\b/);
    expect(read(BODY)).toMatch(/export function MatchBodyActions\b/);
  });

  it("RF-082: the details route creates its draft with newMatchDetailsDraft in a useState initialiser and opens no session of its own", () => {
    const source = read(DETAILS);
    expect(source).toMatch(/\buseState\(/);
    expect(source).toMatch(/\bnewMatchDetailsDraft\(/);
    expect(source).not.toMatch(/\bopenMatch\(/);
    expect(source).not.toMatch(/\bgetNewMatchDraft\b/);
  });

  it("RF-025 RF-082: the match form takes a MatchFieldsStore and no longer names the new-match draft", () => {
    const source = read(FORM);
    expect(source).toMatch(/\bMatchFieldsStore\b/);
    expect(source).not.toMatch(/\bNewMatchDraft\b/);
  });
});
