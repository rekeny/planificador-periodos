# Review · 000 Project setup

## Pre-implementation analysis (phase 4)

Not applicable: phase 0 has no `spec.md` or RF/E by design (documented in `plan.md`, field "Spec"); the developer approved the plan on 2026-11-10.

## Verification (phase 7)

- Date and commit: 2026-11-10, on `becffa9` plus the fixes from the second Codex review (C-09 and C-11), not yet committed at that moment. Earlier verification, on `b2c3db9` and `becffa9`: also green.
- Result: green (`npm run verify`, exit 0, "All checks passed"). No Maestro flows yet.

```text
> planificador-periodos@1.0.0 verify
> scripts/verify.sh


▶ Types

▶ Lint

▶ Format
Checking formatting...
All matched files use Prettier code style!

▶ Focused or skipped tests

▶ Tests and coverage

=============================== Coverage summary ===============================
Statements   : 80% ( 4/5 )
Branches     : 100% ( 0/0 )
Functions    : 50% ( 1/2 )
Lines        : 80% ( 4/5 )
================================================================================
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.751 s, estimated 1 s
Ran all test suites.

▶ Traceability
Traceability OK (1 specs checked).

▶ Expo Doctor
Running 20 checks on your project...
20/20 checks passed. No issues detected!

▶ Mutation testing (skipped: no domain changes)

▶ Dependencies
(npm audit --omit=dev --audit-level=high: no high findings; the full list is reproduced with `npm audit`)
Starting filesystem walk for root: /
Scanned /Users/rekeny/code/planificador-periodos/package-lock.json file and found 1190 packages
End status: 0 dirs visited, 1 inodes visited, 1 Extract calls, 351.41525ms elapsed, 351.419ms wall time
Loaded filter from: /Users/rekeny/code/planificador-periodos/osv-scanner.toml
GHSA-gcqx-w48m-w2h4 and 1 alias have been filtered out because: deepmerge 4.3.1, indirect from jest-config (development only); no fixed version. Approved by Fernando on 2026-11-10.
GHSA-3g3m-2fjr-6pw4 and 1 alias have been filtered out because: glob 10.5.0 and 13.0.7, indirect from Expo CLI and Jest; the fix needs glob 14, a major version we do not control. Approved by Fernando on 2026-11-10.
GHSA-3g3m-2fjr-6pw4 and 1 alias have been filtered out because: glob 10.5.0 and 13.0.7, indirect from Expo CLI and Jest; the fix needs glob 14, a major version we do not control. Approved by Fernando on 2026-11-10.
GHSA-g3hv-75wg-m249 and 1 alias have been filtered out because: minimatch 9.0.9 and 10.2.6, indirect from ESLint, Expo and Stryker; the fix needs minimatch 11, a major version we do not control. Approved by Fernando on 2026-11-10.
GHSA-g3hv-75wg-m249 and 1 alias have been filtered out because: minimatch 9.0.9 and 10.2.6, indirect from ESLint, Expo and Stryker; the fix needs minimatch 11, a major version we do not control. Approved by Fernando on 2026-11-10.
GHSA-4mjr-xmp4-gh2g and 1 alias have been filtered out because: qs 6.15.1, indirect from Stryker (development only). Approved by Fernando on 2026-11-10.
GHSA-6pq8-jhm2-2vcw and 1 alias have been filtered out because: qs 6.15.1, indirect from Stryker (development only). Approved by Fernando on 2026-11-10.
GHSA-q8mj-m7cp-5q26 and 1 alias have been filtered out because: qs 6.15.1, indirect from Stryker (development only). Approved by Fernando on 2026-11-10.
GHSA-x5fp-wj9c-mxmx and 1 alias have been filtered out because: qs 6.15.1, indirect from Stryker (development only). Approved by Fernando on 2026-11-10.
Filtered 9 vulnerabilities from output

No issues found

▶ Secrets
2:10PM INF 14 commits scanned.
2:10PM INF scanned ~1270233 bytes (1.27 MB) in 117ms
2:10PM INF no leaks found

▶ Static analysis

✔ All checks passed
```

## Codex review (phase 8)

Full file: [codex-review.md](codex-review.md)

| #    | Finding                                                                                                                                                                                                      | File                                | Severity  | Status                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| C-01 | `spec.md` is missing: without RF requirements or E examples, coverage and the absence of added scope cannot be proven, and `review.md` skips the pre-implementation analysis without a documented exception. | `specs/000-puesta-en-marcha/`       | blocking  | Resolved: `plan.md` documents that phase 0 has no spec and why traceability does not apply                                    |
| C-02 | `eslint.config.js` allows external packages in every layer and then restricts only some: `src/data/` and `src/i18n/` can import `react-native`, against the layer table.                                     | `eslint.config.js:31`               | important | Fixed: ESLint limits packages per layer (and their subpaths); checked with temporary files                                    |
| C-03 | `i18next/no-literal-string` in `jsx-text-only` mode accepts `<Text>{"Fixed text"}</Text>` and `accessibilityLabel="Fixed text"`.                                                                             | `eslint.config.js:142`              | important | Fixed: `no-literal-string` in `jsx-only` mode with visible attributes; checked with temporary files                           |
| C-04 | The traceability checker looks for IDs in the whole test content: a `// RF-001 E-01` comment is enough to get "Traceability OK".                                                                             | `scripts/check-traceability.mjs:46` | important | Fixed: traceability reads only the names of `it`/`test`/`describe`; checked with a misleading comment                         |
| C-05 | `verify.sh` does not detect `it.skip.each(...)` or `it.only.each(...)`.                                                                                                                                      | `scripts/verify.sh:43`              | important | Fixed: `verify.sh` detects `it.skip.each`, `it.only.each`, `xit` and `fit`; checked with temporary files                      |
| C-06 | ESLint forbids `fetch(...)` but allows `globalThis.fetch(...)` (and variants of the other three APIs).                                                                                                       | `eslint.config.js:109`              | important | Fixed: `checkGlobalObject` enabled; checked with `globalThis.fetch` and `window.WebSocket`                                    |
| C-07 | The workflow downloads gitleaks and osv-scanner without checking their integrity (same as S-01).                                                                                                             | `.github/workflows/verify.yml:38`   | important | Fixed: SHA-256 pinned in `verify.yml` and checked before installing                                                           |
| C-08 | `jest`, `jest-expo` and `@types/jest` are in `dependencies` and the plan declares them as development (same as S-03).                                                                                        | `package.json:23`                   | minor     | Fixed: moved to `devDependencies`                                                                                             |
| C-09 | Second review: traceability accepts commented-out tests and empty `describe` blocks.                                                                                                                         | `scripts/check-traceability.mjs:48` | important | Fixed: comments are stripped and only `it`/`test` count; checked with a negative trial                                        |
| C-10 | Second review: test IDs are global, so a test of one spec can count for another that reuses `RF-001` or `E-01`.                                                                                              | `scripts/check-traceability.mjs:58` | important | Pending (decided by Fernando, 2026-11-10): today only phase 0 exists; the per-spec ID convention is decided when starting 001 |
| C-11 | Second review: if `origin/main` is missing or equals `HEAD`, `verify.sh` skips mutation testing.                                                                                                             | `scripts/verify.sh:23`              | important | Fixed: with no base that can be determined, mutation testing runs; checked with three cases                                   |
| C-12 | Second review: actions pinned by a mutable tag (same as S-02).                                                                                                                                               | `.github/workflows/verify.yml:27`   | minor     | Open                                                                                                                          |

## Security (phase 8)

| #    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Severity  | Status                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| S-01 | `.github/workflows/verify.yml`: gitleaks and osv-scanner are downloaded with `curl` from GitHub Releases and run without checking their SHA-256. The versions are pinned, but integrity is not verified; a tampered binary would run in CI with access to the repository. Fix: check the published checksum (`checksums.txt`) before installing.                                                                                                                                                                                                                 | important | Fixed (C-07 / C-08)                                                                                  |
| S-02 | `.github/workflows/verify.yml`: `actions/checkout@v7` and `actions/setup-node@v7` are pinned by tag, which is mutable. Fix: pin them by commit SHA, with the version in a comment.                                                                                                                                                                                                                                                                                                                                                                               | minor     | Open                                                                                                 |
| S-03 | `package.json`: `jest`, `jest-expo` and `@types/jest` are in `dependencies`, and the plan declares them as "Development". So `npm audit --omit=dev` (the `verify.sh` control) counts 24 vulnerabilities, not only production ones, and the control loses its meaning. Fix: move them to `devDependencies`.                                                                                                                                                                                                                                                       | minor     | Fixed (C-07 / C-08)                                                                                  |
| S-04 | Template dependencies not justified one by one in `plan.md` (the T004 deviation says "among others") and unused in `src/`: `expo-web-browser`, `expo-linking`, `expo-device`, `expo-constants`, `expo-font`, `expo-image`, `expo-symbols`, `expo-glass-effect`, `@expo/ui`, `react-native-reanimated` and `react-native-worklets`. `expo-web-browser` can open external links, and ESLint does not forbid those modules. The developer's approval exists, but it is not detailed. Fix: list them in the plan or remove the unused ones before 001.               | minor     | Open                                                                                                 |
| S-05 | The generated Android manifest declares `INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` (the last two up to SDK 32), and `app.json` has no `android.blockedPermissions`. Most come from `expo-dev-client` and the template. On iOS, `Info.plist` includes `NSLocalNetworkUsageDescription` from the development launcher. It does not block phase 0, but must be resolved in "Before each release": block the extra permissions and check that the development client does not get into the production build. | minor     | Pending before publishing                                                                            |
| S-06 | The full `npm audit` reports 36 vulnerabilities (1 low, 35 moderate, none high). `verify.sh` only fails at high level, and the moderate ones have no exception in `osv-scanner.toml`, except the 9 that OSV-Scanner does filter. The verification output in this `review.md` mentions 24 because it uses `--omit=dev` (see S-03). The developer should accept that threshold explicitly or `docs/security.md` should record it.                                                                                                                                  | minor     | Fixed: `docs/security.md` records that `npm audit` fails only at high severity or above (2026-11-11) |

No blocking findings. Checked and correct: `permissions: contents: read` and no secrets or `pull_request_target` in the workflow; `android.allowBackup: false` in `app.json` and in the generated manifest; link scheme `planificadorperiodos` with no destructive routes; `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `console` forbidden by ESLint; `src/` with no network, logs or SQL; lockfile only with `registry.npmjs.org`, with integrity and no Git dependencies; only 2 packages with an install script (`fsevents`, `@parcel/watcher`); `npm audit --omit=dev --audit-level=high` and OSV-Scanner with no high findings; the 7 exceptions in `osv-scanner.toml` have a reason, expire on 2027-02-08 (exactly 90 days) and cite Fernando's approval, and the 9 vulnerabilities are medium severity and match the OSV-Scanner output; the scripts in `scripts/` do not run downloaded code or send player data.

## Verdict

- [x] No open blocking finding
- [x] Important findings fixed or accepted as pending by the developer (C-10 accepted as pending on 2026-11-10)
