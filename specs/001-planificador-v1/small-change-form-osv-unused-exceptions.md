# Small change form · Remove the two osv-scanner exceptions whose advisories were withdrawn

- **Date:** 2026-11-21
- **Branch:** `fix/osv-unused-exceptions`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

Two exceptions are removed from `osv-scanner.toml`: `GHSA-gcqx-w48m-w2h4` (deepmerge) and `GHSA-fc5q-39xc-vjpf` (picomatch). The comment at the top of the file is brought up to date: the picomatch one was the only «high» exception, and the approval dates lose 2026-11-17, the date of that one. The other seven exceptions (glob, minimatch, four of `qs`, esbuild) stay as they are.

## Why

Since 2026-11-20 `npm run verify` prints «osv-scanner.toml has unused ignores» for exactly these two (it was noted in the report of the Maestro run, `review.md`). The advisories were **withdrawn** by their publisher, so they no longer apply to anything, and `osv-scanner scan source --lockfile=package-lock.json` finds no issue without them:

| Advisory | Package | What it said | Withdrawn |
| --- | --- | --- | --- |
| `GHSA-gcqx-w48m-w2h4` | deepmerge 4.3.1 (from jest-config, development only) | prototype poisoning in `mergeObject()` | 2026-11-16 |
| `GHSA-fc5q-39xc-vjpf` | picomatch 2.3.2 and 4.0.7 (from Metro, Expo CLI and Jest) | ReDoS through repeated extglobs, high | 2026-11-18 |

(Read from `https://api.osv.dev/v1/vulns/<id>` on 2026-11-21: both entries start with «Withdrawn Advisory» and carry a `withdrawn` date.) The installed versions did not change: `npm ls` still shows deepmerge 4.3.1 and picomatch 4.0.7.

Why remove them and not leave them: an exception that no longer matches anything is noise that the tool already warns about, and it hides the rule of `docs/security.md` («without reason, expiry and approval there is no exception»): an unused entry still looks like an approved risk. If an advisory for the same package comes back, it will have a new ID and the scan will fail, as it should, until it is looked at.

## How

- `osv-scanner.toml`: delete the two `[[IgnoredVulns]]` blocks; the header says the exceptions are medium severity, come from development and build tools, and were approved on 2026-11-10 and 2026-11-13.
- No other file changes (`docs/security.md` describes the rule, not the list; `specs/…/review.md` and the Security reports keep their history as it was written).
- The Security role reviews it, as `AGENTS.md` asks for a change to configuration (rule 16): it removes exceptions, so it can only make the scan stricter.

No change in `src/`, tests, dependencies, `package-lock.json`, the spec or `scripts/check-npm-audit.mjs`.

## Why it is small

It changes no behaviour of the app and touches no dependency: two entries that the scanner itself reports as unused leave a configuration file.

## Tests

`npm run verify` must stay green, and its osv-scanner step must no longer print the «unused ignores» warning. `osv-scanner scan source --lockfile=package-lock.json` must still end with «No issues found». The check that the remaining seven exceptions are still used is the same output: it lists them as «filtered out». **Not covered:** a later change of the advisory database, which can bring back a finding with a new ID; that is what the scan is for.
