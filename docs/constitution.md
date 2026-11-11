# Constitution

Non-negotiable principles. Every spec, plan or code change respects them. They only change with an ADR approved by the developer (see `docs/decisions/`).

## Product

1. **Inform, never block.** Any combination can be marked even if it breaks the regulations. The only limit is that a period never has more than 5 X. The decision always belongs to the coach.
2. **Nothing changes by itself.** The app does not modify marks on its own. Marks are only deleted when the coach confirms it.
3. **Offline and no data leaving.** Everything is stored on the device. No accounts, sync, analytics, third-party SDKs or network calls.
4. **Every tap is saved at once.** If the app closes mid-match, everything is as it was on return.
5. **Children's data.** The app stores children's names. They never leave the device or appear in logs, and Android automatic backup is disabled.
6. **Simple.** Little data and few taps. Nothing "just in case": generalise when a second real case appears.
7. **In Spanish.** The interface is only in Spanish and its texts live in `src/i18n/es.json`.

## Engineering

8. **The repository is the single source of truth.** Rules, specs, plans and decisions live in Markdown, versioned with the code. What only exists in a chat does not exist.
9. **A single rules file for everyone:** `AGENTS.md`.
10. **Machines check and people decide.** What a script can verify is not left to an agent's opinion. The developer approves the spec, the plan and the result.
11. **Whoever writes does not review.** Another agent with a clean context does the review. The code review is done by Codex, which is a different model.
12. **Nothing is invented.** If a piece of data is missing, it is asked and the answer is recorded in the spec.
13. **Process proportional to the change,** according to the levels in `AGENTS.md`.
14. **Small, checkable steps:** one task, one commit and the verification green.
15. **Nothing is coded without approval** of the spec and the plan.
16. **The rules of the regulations live only in `src/domain/`,** as pure, tested functions.
17. **A single code style.** The same layers, conventions and glossary from day one, and ESLint enforces it.
18. **Tests look for bugs.** They cover everything the user can do, not only the path that makes the code pass. Thresholds: 90 % coverage in `src/domain/` and at least 80 % of mutants killed by Stryker.
19. **Explain before and after,** so the app is understood and not only used.

## Change log

| Date       | ADR              | Change                                        |
| ---------- | ---------------- | --------------------------------------------- |
| 2026-11-10 | ADR-001, ADR-002 | Initial version                               |
| 2026-11-11 | ADR-003          | Translated into English; principles unchanged |
