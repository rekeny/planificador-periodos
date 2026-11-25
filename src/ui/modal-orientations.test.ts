// RF-076: React Native's `Modal` on iPhone defaults to portrait only, so every `Modal` in the app
// must list the four orientations explicitly (Codex run 3, F-D3-07).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { ALL_ORIENTATIONS } from "@/ui/modal-orientations";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe("every Modal of the app", () => {
  const modals = sourceFiles("src").flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return [...text.matchAll(/<Modal\b[\s\S]*?\n\s*>\n/g)].map((m) => ({
      file,
      tag: m[0],
    }));
  });

  it("RF-076: the shared list holds the four orientations of a phone", () => {
    expect([...ALL_ORIENTATIONS].sort()).toEqual([
      "landscape",
      "landscape-left",
      "landscape-right",
      "portrait",
      "portrait-upside-down",
    ]);
  });

  it("RF-076: there is at least one Modal to check", () => {
    expect(modals.length).toBeGreaterThan(0);
  });

  it.each(modals.map((m) => [m.file, m.tag]))(
    "RF-076: %s supports every orientation",
    (_file, tag) => {
      expect(tag).toContain("supportedOrientations={ALL_ORIENTATIONS}");
    },
  );
});
