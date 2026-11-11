# Codex review

- Date: 2026-11-10 14:06
- Branch: 000-puesta-en-marcha against main
- Commit: becffa9

> Translated into English on 2026-11-11 (ADR-003). Codex wrote the original output in Spanish.

Review of `git diff main...HEAD`, up to `becffa9`: **3 IMPORTANT findings and 1 MINOR. No BLOCKING findings detected.**

1. **Requirements and scope: no findings.** The approved plan expressly exempts this phase from having `spec.md`, RF and E. The implementation matches the described setup.

2. **Constitution, layers and conventions: no additional findings.** The cases checked confirm that ESLint rejects imports between layers that are not allowed and literal texts in JSX.

3. **Tests and controls:**

   - **IMPORTANT — Traceability accepts commented-out tests and empty suites.** In [check-traceability.mjs:48](/Users/rekeny/code/planificador-periodos/scripts/check-traceability.mjs:48), the regular expression still reads comments and treats `describe` as a test. Reproduced in memory: both `// it("RF-001 E-01: …", …)` and `describe("RF-001 E-01: …", () => {})` produce `Traceability OK` without testing that behaviour. **Fix:** analyse executable calls with a parser, exclude comments and require `it`/`test` tests; add negative cases for both examples.

   - **IMPORTANT — One spec can count as coverage for another.** In [check-traceability.mjs:58](/Users/rekeny/code/planificador-periodos/scripts/check-traceability.mjs:58), all identifiers are added to a single global set. When two specs reuse `E-01` or `RF-001`, a test of the first will also satisfy the second. **Fix:** link the tests to their spec and check "spec, ID" pairs, with a case that repeats identifiers across two specs.

   - **IMPORTANT — Change detection can skip mutation testing.** In [verify.sh:23](/Users/rekeny/code/planificador-periodos/scripts/verify.sh:23), if `origin/main` is missing, the error turns into an empty base and the already committed changes are not checked. In the `push` workflow to `main`, `origin/main` can also equal `HEAD`, leaving the diff empty. **Fix:** provide the base explicitly according to the event and use a conservative fallback that runs mutation testing when it cannot be determined.

   No existing tests were deleted or weakened: `main` had no tests. The new assertion checks the accessible title.

4. **Security:**

   - **MINOR — Actions pinned by mutable tags.** [verify.yml:27](/Users/rekeny/code/planificador-periodos/.github/workflows/verify.yml:27) and line 31 use `actions/checkout@v7` and `actions/setup-node@v7`. **Fix:** pin both by commit SHA and keep the version as a comment.

   No additional findings in `src/` about network calls, player logs or SQL. `android.allowBackup` is disabled.

5. **Explanations: no additional contradictions detected.** The summary file is missing, but T011 is still pending. The verification output belongs to `b2c3db9`, before the latest fixes; verifying and documenting the final state is still pending.

6. **Simplicity, clarity and efficiency: no findings.**

**Validation:** types, lint, formatting of scripts and documents checked, and traceability pass. Jest could not start because a cache write was denied in this read-only session. I do not certify the full verification and I have not modified any files.
