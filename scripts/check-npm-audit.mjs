// Fails on high or critical `npm audit` advisories that osv-scanner.toml does not approve, and on
// any exception of osv-scanner.toml that breaks the 90-day rule.
// `npm audit` has no exceptions file, so the list of docs/security.md ("Exceptions") is reused.
// Usage: npm audit --omit=dev --json | node scripts/check-npm-audit.mjs
// The exceptions are read from osv-scanner.toml in the current folder.
import { existsSync, readFileSync } from "node:fs";

const BLOCKING = new Set(["high", "critical"]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;
// docs/security.md: an exception has an expiry of 90 days at most.
const MAX_DAYS = 90;
// A full TOML datetime with a zone, such as 2027-02-08T00:00:00Z. RFC 3339 also allows a lowercase
// t or z and a space instead of the T. A bare year or a date alone has no time of day, and a
// datetime without a zone depends on the machine's clock, so neither counts.
const DATETIME =
  /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

// The [[IgnoredVulns]] entries of the file. An entry runs from its header to the next table header
// (a line that starts with `[`), so it never reads keys of another table. `suspect` marks an entry
// that cannot be read safely: a multi-line string (it can hide a key line) or a repeated key.
function entries(toml) {
  const found = [];
  let current;
  for (const line of toml.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) {
      current = /^\s*\[\[IgnoredVulns\]\]\s*(#.*)?$/.test(line)
        ? { ids: [], untils: [], suspect: false }
        : undefined;
      if (current !== undefined) found.push(current);
      continue;
    }
    if (current === undefined) continue;
    if (line.includes('"""') || line.includes("'''")) current.suspect = true;
    const id = /^\s*id\s*=\s*"([^"]+)"/.exec(line)?.[1];
    if (id !== undefined) current.ids.push(id);
    // The value ends before a trailing comment; a datetime may hold a space.
    const until = /^\s*effectiveUntil\s*=\s*(.*?)\s*(?:#.*)?$/.exec(line)?.[1];
    if (until !== undefined) current.untils.push(until);
  }
  return found.map((entry) => ({
    id: entry.ids[0],
    suspect: entry.suspect || entry.ids.length > 1 || entry.untils.length > 1,
    until: entry.untils[0],
  }));
}

// Milliseconds of the expiry, or NaN if the entry has no readable full datetime.
function expiryOf({ until, suspect }) {
  if (suspect || until === undefined || !DATETIME.test(until)) return NaN;
  return Date.parse(until.replace(/[Tt ]/, "T").replace(/z$/, "Z"));
}

// Problems of every [[IgnoredVulns]] entry, whether npm audit needs it or not: osv-scanner in
// verify.sh honours any effectiveUntil. An entry that has already expired is fine: osv-scanner
// no longer honours it. Any other entry needs a full datetime with a zone at most 90 days away.
export function exceptionProblems(toml, now = new Date()) {
  const problems = [];
  for (const entry of entries(toml)) {
    const ok = expiryOf(entry) <= now.getTime() + MAX_DAYS * DAY; // false for NaN
    if (!ok) {
      problems.push(
        `  ${entry.id ?? "(entry without an id)"}: effectiveUntil must be a single full datetime with a zone, at most ${MAX_DAYS} days away`,
      );
    }
  }
  return problems;
}

// Ids of the [[IgnoredVulns]] entries whose effectiveUntil is a full datetime that has not passed
// and is at most 90 days away. An entry without it, or with another kind of value, never ends or
// ends too late, so it does not count.
export function approvedIds(toml, now = new Date()) {
  const ids = new Set();
  for (const entry of entries(toml)) {
    const expiry = expiryOf(entry);
    const valid =
      expiry > now.getTime() && expiry <= now.getTime() + MAX_DAYS * DAY;
    if (entry.id !== undefined && valid) ids.add(entry.id);
  }
  return ids;
}

export function parseAudit(text) {
  let audit;
  try {
    audit = JSON.parse(text);
  } catch {
    return undefined;
  }
  const valid = audit !== null && typeof audit.vulnerabilities === "object";
  return valid && audit.vulnerabilities !== null ? audit : undefined;
}

function advisoryId(via) {
  return /GHSA-[a-z0-9-]+/i.exec(via.url ?? "")?.[0] ?? String(via.source);
}

// Map of advisory id to the set of packages it affects, for high and critical advisories only.
export function blockingAdvisories(audit) {
  const found = new Map();
  for (const [name, entry] of Object.entries(audit.vulnerabilities)) {
    for (const via of entry.via ?? []) {
      if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
      const id = advisoryId(via);
      found.set(id, (found.get(id) ?? new Set()).add(via.name ?? name));
    }
  }
  return found;
}

function readToml() {
  return existsSync("osv-scanner.toml")
    ? readFileSync("osv-scanner.toml", "utf8")
    : "";
}

function main() {
  const toml = readToml();
  const problems = exceptionProblems(toml);
  if (problems.length > 0) {
    fail(
      `check-npm-audit: invalid exceptions in osv-scanner.toml (docs/security.md, "Exceptions"):\n${problems.join("\n")}`,
    );
  }
  const audit = parseAudit(readFileSync(0, "utf8"));
  if (audit === undefined) {
    fail(
      "check-npm-audit: the npm audit output is not valid JSON of an audit.",
    );
  }
  const approved = approvedIds(toml);
  const unapproved = [...blockingAdvisories(audit)].filter(
    ([id]) => !approved.has(id),
  );
  if (unapproved.length === 0) {
    console.log("npm audit: no unapproved high or critical advisories.");
    return;
  }
  const lines = unapproved.map(
    ([id, names]) => `  ${id}: ${[...names].join(", ")}`,
  );
  fail(
    `check-npm-audit: unapproved high or critical advisories (see osv-scanner.toml):\n${lines.join("\n")}`,
  );
}

main();
