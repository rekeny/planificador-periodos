#!/usr/bin/env node
// Traceability check. Every requirement (RF-NNN) and example (E-NN) of a completed task must appear
// in at least one test name. When a spec is closed, every requirement and example it defines must.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ID_PATTERN = /\b(?:RF-\d{3}|E-\d{2})\b/g;
const TEST_FILE_PATTERN = /\.test\.tsx?$|\.ya?ml$/;
const TEST_ROOTS = ["src", "tests", "e2e"];
const SPECS_DIR = "specs";

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map((entry) => join(dir, String(entry)))
    .filter((path) => statSync(path).isFile());
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function idsIn(text) {
  return new Set(text.match(ID_PATTERN) ?? []);
}

function completedTaskIds(tasksText) {
  const lines = tasksText
    .split("\n")
    .filter((line) => /^\s*- \[x\]/i.test(line));
  return idsIn(lines.join("\n"));
}

function definedIds(specText) {
  const ids = new Set();
  for (const line of specText.split("\n")) {
    if (/retirado/i.test(line)) continue;
    const id =
      line.match(/^\s*-\s*\*\*(RF-\d{3})\*\*/)?.[1] ??
      line.match(/^\|\s*(E-\d{2})\s*\|/)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

// Only the names of executable tests count: a comment such as "// RF-001" proves nothing.
const TEST_NAME_PATTERN =
  /\b(?:it|test|describe)(?:\.\w+)*(?:\((?:[^()]|\([^()]*\))*\))?\s*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

function testNamesIn(path) {
  const source = readFileSync(path, "utf8");
  if (/\.ya?ml$/.test(path)) return source.replace(/^\s*#.*$/gm, "");
  return [...source.matchAll(TEST_NAME_PATTERN)]
    .map((match) => match[2])
    .join("\n");
}

const testedIds = idsIn(
  TEST_ROOTS.flatMap(listFiles)
    .filter((path) => TEST_FILE_PATTERN.test(path))
    .map(testNamesIn)
    .join("\n"),
);

const specDirs = existsSync(SPECS_DIR)
  ? readdirSync(SPECS_DIR)
      .map((name) => join(SPECS_DIR, name))
      .filter((path) => statSync(path).isDirectory())
  : [];

const problems = [];
for (const dir of specDirs) {
  const spec = readIfExists(join(dir, "spec.md"));
  const isClosed = /\*\*Estado:\*\*\s*Cerrada/i.test(spec);
  const required = isClosed
    ? definedIds(spec)
    : completedTaskIds(readIfExists(join(dir, "tasks.md")));
  const untested = [...required].filter((id) => !testedIds.has(id)).sort();
  if (untested.length > 0) problems.push(`${dir}: ${untested.join(", ")}`);
}

if (problems.length > 0) {
  console.error("Requirements or examples without a test:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Traceability OK (${specDirs.length} specs checked).`);
