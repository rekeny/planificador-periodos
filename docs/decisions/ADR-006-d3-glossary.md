# ADR-006 · Five glossary terms added for D3

- **Status:** Accepted
- **Date:** 2026-11-21
- **Decided by:** Fernando, 2026-11-21 (chat, «Apruebo»)

## Context

The D3 review of spec 001 (`specs/001-planificador-v1/plan.md`, "D3 design after the review of 2026-11-21") found five names that D3 uses in the code and that the glossary of `docs/architecture.md` does not have. The glossary says that a new concept is added there before it is used in the code, and the file is part of the architecture, so adding them needs an approved ADR (constitution, `AGENTS.md` rule 11), as ADR-004 and ADR-005 did for the folders and the stack table. The Reviewer raised it as finding I-4 of the phase 4 review.

## Decision

Add these rows to the glossary of `docs/architecture.md`:

| In the app (Spanish)         | Meaning                                                                                                                                 | In the code                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| —                            | The question, choice of the replaced X, reminder or long-press menu waiting for the coach's answer                                      | `PendingQuestion`, `pending`                   |
| —                            | The starters a starter in place of another may replace, as the view shows them                                                          | `replaceableStarters`                          |
| —                            | The match fields and their setters that the new-match draft and the details draft share, and the read-only store of them the form takes | `MatchFieldsState`, `MatchFieldsStore`         |
| —                            | The editable copy of a saved match's details, one per details screen, saved with «Guardar»                                              | `MatchDetailsDraft`, `createMatchDetailsDraft` |
| Partidos, Todos los partidos | The order of the match lists: date and time, latest first, no time last                                                                 | `compareMatches`                               |

## Consequences

- The glossary grows by five rows. No layer, convention or rule changes, and the constitution does not change.
- No D3 code uses these names before the commit that adds this ADR and the rows (D3 rule 13 in `tasks.md`). If a name has to change later, it is renamed in the glossary, `plan.md` and `tasks.md` together.
