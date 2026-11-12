/// <reference types="node" />
// Shared helpers of the tests of scripts/check-traceability.mjs (T001, T080).
//
// The script reads every test name under tests/, but only in files that end in `.test.ts`, so this
// helper file is never read as a test. The fixtures are written to a temporary folder at run time,
// and the fixture test files are built with the IT placeholder so that no source file contains a
// literal call of the kind the script looks for.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const SCRIPT = resolve(__dirname, "../../scripts/check-traceability.mjs");
export const IT = "it";

export type Files = Record<string, string>;

const createdFolders: string[] = [];

export function createFixture(files: Files): string {
  const root = mkdtempSync(join(tmpdir(), "traceability-fixture-"));
  createdFolders.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

export function runScript(root: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

export function spec(options: {
  status: "In progress" | "Closed";
  requirements?: string[];
  examples?: string[];
  extraLines?: string[];
}): string {
  const requirements = (options.requirements ?? []).map(
    (id) => `- **${id}** · Something the app does.`,
  );
  const examples = (options.examples ?? []).map(
    (id) => `| ${id} | Some situation. | Some result. | RF-000 |`,
  );
  return [
    "# Spec",
    "",
    `- **Status:** ${options.status}`,
    "",
    ...requirements,
    "",
    "| ID | Situation | Result | Covers |",
    "| -- | --------- | ------ | ------ |",
    ...examples,
    ...(options.extraLines ?? []),
    "",
  ].join("\n");
}

export function tasks(...lines: string[]): string {
  return ["# Tasks", "", ...lines, ""].join("\n");
}

export function testFile(...names: string[]): string {
  return names
    .map((name) => `${IT}("${name}", () => {\n  expect(1).toBe(1);\n});`)
    .join("\n");
}

export function removeFixtures(): void {
  for (const folder of createdFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
}
