/// <reference types="node" />
// T083: what the source of the grid may import, read as text, because "draws only MatchView, no
// rule, no store" and "a tablet is decided only by grid-layout.ts" cannot be seen in the tree.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = ["src/ui/grid/match-grid.tsx", "src/ui/grid/player-column.tsx"];
const ROOT = join(__dirname, "..", "..", "..");
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

// Every import statement as written, from `import` to the quoted module name.
function importStatements(file: string): { text: string; from: string }[] {
  return [
    ...read(file).matchAll(/import\s+(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/g),
  ].map((match) => ({ text: match[0], from: match[1] ?? "" }));
}

describe("match grid source", () => {
  it.each(FILES)(
    "RF-077: %s imports only types from the domain and from the state, and never the data layer, a store or zustand",
    (file) => {
      const imports = importStatements(file);
      expect(imports.length).toBeGreaterThan(0);
      for (const { text, from } of imports) {
        if (/^@\/(domain|state)\//.test(from)) {
          expect(text).toMatch(/^import\s+type\b/);
        }
        expect(from).not.toMatch(/^@\/data\b|zustand|expo-sqlite|drizzle/);
        expect(from).not.toMatch(/app-stores|-store$/);
      }
    },
  );

  it.each(FILES)(
    "RF-076: %s never asks Platform whether it is a tablet and never applies the tablet width itself",
    (file) => {
      const source = read(file);
      expect(source).not.toMatch(/\bPlatform\b/);
      expect(source).not.toContain("TABLET_MIN_SHORT_SIDE");
      expect(source).not.toContain("buttonsInHeader");
    },
  );

  it("RF-076: match-grid.tsx reads the window with useWindowDimensions and takes its sizes from grid-layout", () => {
    const source = read(FILES[0] ?? "");
    expect(source).toContain("useWindowDimensions");
    const modules = importStatements(FILES[0] ?? "").map((i) => i.from);
    expect(
      modules.some((from) => /^(\.\/|@\/ui\/grid\/)grid-layout$/.test(from)),
    ).toBe(true);
  });
});
