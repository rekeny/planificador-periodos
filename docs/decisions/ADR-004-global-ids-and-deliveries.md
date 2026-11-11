# ADR-004 · Global requirement IDs and delivery of a spec in parts

- **Status:** Proposed
- **Date:** 2026-11-11
- **Decided by:** — (pending Fernando's approval in phase 4)

## Context

**IDs.** Phase 0 left finding C-10 pending (`specs/000-puesta-en-marcha/review.md`): `scripts/check-traceability.mjs` puts every tested ID in a single global set, so when two specs reuse `RF-001` or `E-01`, a test written for one spec also counts for the other. Fernando decided to settle the convention when starting spec 001. Spec 001 already numbers its examples with three digits (`E-001`…`E-032`, clarification D36), but the script and `docs/architecture.md` still expect two (`E-\d{2}`). With the current pattern, `\bE-\d{2}\b` does not even match `E-001`, so the examples of spec 001 would never be checked.

**Deliveries.** Spec 001 has 88 requirements and 32 examples across seven stories. `AGENTS.md` says "one branch per spec". A single branch for all of it would mean weeks of work before the first merge, one huge PR for Codex to review and no usable intermediate result. The rules engine (`src/domain/`) can be built and verified on its own, and stories US1–US4 (P1) already make the app usable in a match.

## Decision

1. **Global, three-digit requirement and example IDs.**
   - Requirements are `RF-NNN` and examples `E-NNN`, always with three digits.
   - IDs are unique across the whole repository, not per spec. Spec 001 starts at `RF-001` and `E-001`; the next spec continues after the highest ID used so far (today `RF-089` and `E-033`). The Specifier looks up the highest `RF` and `E` in `specs/` before numbering.
   - An ID is never reused. A retired requirement or example keeps its line in its spec, marked "retired", and its number is not given to anything else.
   - `scripts/check-traceability.mjs` reads three-digit IDs and fails when the same ID is defined in more than one `spec.md`. Because IDs are unique, a test name that carries an ID can only belong to one spec, which resolves C-10.
   - Task IDs (`T001`…) stay per spec, as today: they never appear in test names.

2. **Spec 001 is delivered in three parts, each with its own branch and PR.**
   - **Before D1:** the clarified spec, the plan, `tasks.md`, the phase 4 `review.md` and this ADR go to `main` in a documentation-only PR from `001-planificador-v1-spec`, once Fernando approves them. A spec delivered in parts names that branch `NNN-name-spec`.
   - **D1 · Rules engine:** branch `001-planificador-v1-d1`. `src/domain/`, with the domain part of the spec examples, plus three supporting changes outside it: the traceability script, its test and the documents that quote IDs (T001); the new glossary terms in `docs/architecture.md` (T002); and the Jest and Stryker settings that keep mutation testing within the CI time limit (T013). No screen, data or state code.
   - **D2 · Usable in a match:** branch `001-planificador-v1-d2`. US1–US4: data, state and screens.
   - **D3 · Rest of v1:** branch `001-planificador-v1-d3`. US5–US7 and the closing task of the spec.
   - Each delivery goes through phases 5 to 8 for its own tasks and ends with a PR to `main` with the verification green. The developer's acceptance of each PR is the checkpoint of that delivery.
   - Before D2 and before D3 start, the Planner reviews that delivery's part of `plan.md` and `tasks.md` with the lessons of the previous delivery, records the changes in "Deviations", and Fernando approves the plan again.
   - The spec stays "In progress" from D1 until the closing task of D3, which sets it to "Closed". The first task of D1 (T001) sets it to "In progress".

## Discarded alternatives

- **Per-spec IDs with a spec prefix in test names** (for example `001/RF-001`): longer test names and commits, and every tool that reads IDs has to learn the prefix.
- **Per-spec IDs, with the script linking each test file to its spec by folder:** tests are organised by layer, not by spec, so a test file can cover several specs.
- **Keeping two-digit examples (`E-01`):** spec 001 already has 19 examples, and with global numbering two digits run out after 99 examples.
- **A single branch and PR for the whole of spec 001:** too large to review well, nothing reaches `main` for weeks, and a late problem forces rework across every layer.
- **One branch per story:** seven PRs, and US1–US4 are not usable separately, so each would need its own device checkpoint without giving the coach anything to use.

## Consequences

- `scripts/check-traceability.mjs`, its test, the conventions and examples in `docs/architecture.md`, the templates (`.agents/templates/spec.md`, `.agents/templates/tasks.md`) and the roles that quote `E-01` (`specifier.md`, `test-designer.md`) change to three digits. This is task T001 of spec 001.
- The "Branches" rule of `AGENTS.md` changes from "one per spec" to "one per spec; when the plan splits the spec into deliveries, one per delivery named `NNN-name-dN`, after a documentation-only branch named `NNN-name-spec`". The change is made in the documentation PR, when this ADR is accepted.
- The Specifier of a new spec must look up the highest `RF` and `E` used in `specs/` before numbering. T001 adds this rule to `.agents/roles/specifier.md`, next to the three-digit format.
- `scripts/review.sh specs/001-planificador-v1` overwrites `codex-review.md` on every delivery. Each delivery commits its review before the next one starts, so Git keeps all of them. Codex is told the scope of the delivery through `plan.md`; requirements of later deliveries are not findings.
- `summary.md` of spec 001 gets one section per delivery; the closing task of D3 completes it.
- Three PRs mean three device checks and three Codex reviews, which take more of Fernando's time but find problems earlier.
