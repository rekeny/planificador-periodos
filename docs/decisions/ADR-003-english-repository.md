# ADR-003 · English across the repository

- **Status:** Accepted
- **Date:** 2026-11-11
- **Decided by:** Fernando

## Context

`AGENTS.md` asked for code in English and everything else (documentation, specs, commits and PRs) in Spanish. The repository is public: a history and a documentation set in Spanish can only be read by people who read Spanish.

## Decision

- Everything in the repository is written in English: code, commit messages (title and body), documentation, specs, ADRs, role and template files, reports (`summary.md`) and PRs.
- Spanish files are renamed: `resumen.md` becomes `summary.md`, and the ADRs get English names. The `[DUDA]` marker becomes `[DOUBT]`, review severities are Blocking, Important and Minor, and a closed spec has the status "Closed".
- The app stays in Spanish only: its texts live in `src/i18n/es.json`. The glossary keeps the Spanish words the user sees, next to their meaning and their name in the code.
- The conversation with the developer stays in Spanish, in the chat. What is saved in the repository is in English.
- Past commits are not rewritten: `T001` is on `main`, which is protected, and rewriting the PR branch would need a force push. The folder and branch `000-puesta-en-marcha` also keep their name, because the open PR depends on them; new specs get English names.

## Consequences

- Anyone can read the history, the documentation and the specs.
- The phase 0 commits before this decision remain in Spanish.
- `scripts/check-traceability.mjs` and `scripts/review.sh` read and write the English terms.
