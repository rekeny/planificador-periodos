/// <reference types="node" />
// Shared helpers of the tests of scripts/check-focused-tests.sh (T085). This file holds no test
// calls: Jest only runs the `.test.ts` files that import it.
//
// The fixtures are written to a temporary folder at run time, as strings. A fixture line that is a
// skipped or focused call is always a quoted string, so no line of a test file starts with one, and
// the names of skipped or focused functions used as values are built with `dotted`, so that the
// test files do not contain them in the shape that pattern 2 of the script looks for.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";

export const ROOT = resolve(__dirname, "../..");
export const SCRIPT = join(ROOT, "scripts/check-focused-tests.sh");
export const VERIFY = join(ROOT, "scripts/verify.sh");

export type Files = Record<string, string>;

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

const createdFolders: string[] = [];

/** `name` and `modifier` joined with a dot: the call `it.only` is `dotted("it", "only")`. */
export function dotted(name: string, modifier: string): string {
  return [name, modifier].join(".");
}

/** A new temporary folder holding `files` (paths relative to it); it is removed after each test. */
export function createFolder(files: Files = {}): string {
  const root = mkdtempSync(join(tmpdir(), "focused-tests-fixture-"));
  createdFolders.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

export function removeFolders(): void {
  for (const folder of createdFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
}

export function summarise(result: SpawnSyncReturns<string>) {
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

/** Runs the script itself (so that its shebang and executable bit count) with `args`. */
export function runCheck(args: string[], options: RunOptions = {}) {
  return summarise(
    spawnSync(SCRIPT, args, {
      cwd: options.cwd ?? ROOT,
      env: options.env ?? process.env,
      encoding: "utf8",
    }),
  );
}

/** An environment whose first `PATH` entry is a folder holding a fake `grep` that exits with `code`. */
export function envWithStubGrep(code: number): NodeJS.ProcessEnv {
  const folder = createFolder({
    grep: `#!/bin/sh\necho "stub grep: failing on purpose" >&2\nexit ${code}\n`,
  });
  chmodSync(join(folder, "grep"), 0o755);
  return { ...process.env, PATH: `${folder}${delimiter}${process.env.PATH}` };
}

/** Copies the real script into `<root>/scripts/`, when it exists, keeping its mode. */
export function installScript(root: string): void {
  if (!existsSync(SCRIPT)) return;
  mkdirSync(join(root, "scripts"), { recursive: true });
  copyFileSync(SCRIPT, join(root, "scripts/check-focused-tests.sh"));
}
