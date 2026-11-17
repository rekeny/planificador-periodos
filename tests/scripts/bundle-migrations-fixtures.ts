/// <reference types="node" />
// Shared helpers of the tests of scripts/bundle-migrations.mjs and of the generated migrations
// (T027). This file holds no test calls. Fixture projects are written to a temporary folder at run
// time: the script is copied into `<project>/scripts/`, so it is run exactly as in the repository
// (from the project folder, next to `src/data/migrations/`) and never touches the real files.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

export const ROOT = resolve(__dirname, "../..");
export const SCRIPT = join(ROOT, "scripts/bundle-migrations.mjs");
export const REAL_MIGRATIONS = join(ROOT, "src/data/migrations");
export const MIGRATIONS = "src/data/migrations";
export const BUNDLE = `${MIGRATIONS}/bundle.ts`;

export interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface Bundle {
  journal: { entries: JournalEntry[] };
  migrations: Record<string, string>;
}

const createdFolders: string[] = [];

export function removeFolders(): void {
  for (const folder of createdFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
}

export function entry(idx: number, tag: string): JournalEntry {
  return {
    idx,
    version: "6",
    when: 1700000000000 + idx,
    tag,
    breakpoints: true,
  };
}

export function journalText(entries: JournalEntry[]): string {
  return JSON.stringify({ version: "7", dialect: "sqlite", entries }, null, 2);
}

/** A temporary project with the script copied in and `files` (paths relative to the project). */
export function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "bundle-migrations-fixture-"));
  createdFolders.push(root);
  mkdirSync(join(root, "scripts"), { recursive: true });
  if (existsSync(SCRIPT))
    copyFileSync(SCRIPT, join(root, "scripts/bundle-migrations.mjs"));
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

/** A temporary folder inside node_modules, so that files written there resolve the repository's packages. */
export function createScratchFolder(): string {
  const parent = join(ROOT, "node_modules/.cache");
  mkdirSync(parent, { recursive: true });
  const folder = mkdtempSync(join(parent, "t027-"));
  createdFolders.push(folder);
  return folder;
}

/** A temporary project that holds a copy of the real migration folder, without its bundle. */
export function createProjectFromRealMigrations(): string {
  const root = createProject({});
  if (existsSync(REAL_MIGRATIONS)) {
    cpSync(REAL_MIGRATIONS, join(root, MIGRATIONS), { recursive: true });
    rmSync(join(root, BUNDLE), { force: true });
  }
  return root;
}

export function runBundle(root: string) {
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/bundle-migrations.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

/** The bytes of every file under `folder`, by relative path, to compare two states of a folder. */
export function snapshot(folder: string): Record<string, string> {
  const files: Record<string, string> = {};
  if (!existsSync(folder)) return files;
  for (const name of readdirSync(folder, { recursive: true }).map(String)) {
    const path = join(folder, name);
    if (existsSync(path) && !readdirIfFolder(path)) {
      files[name] = readFileSync(path, "utf8");
    }
  }
  return files;
}

function readdirIfFolder(path: string): boolean {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Runs the TypeScript of a bundle and returns its default export. */
export function evaluateBundle(source: string): Bundle {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} as { default?: Bundle } };
  new Function("module", "exports", outputText)(module, module.exports);
  return module.exports.default as Bundle;
}
