#!/usr/bin/env node
// Traceability check. Every requirement (RF-NNN) and example (E-NNN) of a completed task must appear
// in at least one test name. When a spec is closed, every requirement and example it defines must.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ID_PATTERN = /\b(?:RF-\d{3}|E-\d{3})\b/g;
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

// Every ID a spec defines, with whether its line is marked as retired.
function definedIds(specText) {
  const defined = new Map();
  for (const line of specText.split("\n")) {
    const id =
      line.match(/^\s*-\s*\*\*(RF-\d{3})\*\*/)?.[1] ??
      line.match(/^\|\s*(E-\d{3})\s*\|/)?.[1];
    if (id) defined.set(id, /retired/i.test(line) && defined.get(id) !== false);
  }
  return defined;
}

// Only the names of executable tests count: comments and empty `describe` blocks prove nothing.
const TEST_NAME_PATTERN =
  /\b(?:it|test)(?:\.\w+)*(?:\((?:[^()]|\([^()]*\))*\))?\s*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

// Block comments and whole-line comments. A trailing "//" is left alone: it may sit inside a string.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function testNamesIn(path) {
  const source = readFileSync(path, "utf8");
  if (/\.ya?ml$/.test(path)) return source.replace(/^\s*#.*$/gm, "");
  return [...stripComments(source).matchAll(TEST_NAME_PATTERN)]
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
const foldersById = new Map();
for (const dir of specDirs) {
  const spec = readIfExists(join(dir, "spec.md"));
  const defined = definedIds(spec);
  for (const id of defined.keys()) {
    foldersById.set(id, [...(foldersById.get(id) ?? []), dir]);
  }
  const isClosed = /\*\*Status:\*\*\s*Closed/i.test(spec);
  const required = isClosed
    ? new Set([...defined].filter(([, retired]) => !retired).map(([id]) => id))
    : completedTaskIds(readIfExists(join(dir, "tasks.md")));
  const untested = [...required].filter((id) => !testedIds.has(id)).sort();
  if (untested.length > 0) problems.push(`${dir}: ${untested.join(", ")}`);
}
for (const [id, folders] of [...foldersById].sort()) {
  if (folders.length > 1) {
    problems.push(
      `${id} is defined in more than one spec: ${folders.join(", ")}`,
    );
  }
}

if (problems.length > 0) {
  console.error("Requirements or examples without a test:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Traceability OK (${specDirs.length} specs checked).`);
