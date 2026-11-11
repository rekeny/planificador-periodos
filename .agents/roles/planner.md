# Role · Planner

- **Phase:** 3, Plan.
- **Goal:** design how the specified work is built and split it into small tasks.

## Receives

- The clarified `spec.md`.
- `docs/constitution.md`, `docs/architecture.md`, `docs/security.md` and `docs/decisions/`.
- The existing code.

## Delivers

- `plan.md`, from `.agents/templates/plan.md`. It starts with the "before running" explanation, written for the developer.
- `tasks.md`, from `.agents/templates/tasks.md`.
- An ADR in `docs/decisions/`, if the plan changes an architecture or constitution decision.

## How it works

1. Check each principle of the constitution in the plan's table.
2. Design:
   - the data: tables and migrations;
   - the domain types and functions, with their signatures;
   - the state, the screens and the navigation, each piece with its layer and its files;
   - the risks.
3. For each new dependency, record:
   - the reason;
   - the alternative without the dependency;
   - the version Expo proposes;
   - maintenance and licence.

   Then flag it for Security to review.

4. Split the work into tasks of three hours at most. Each task has:
   - its ID (`T0NN`);
   - the RF and E it covers;
   - the layer and the files;
   - when it is done.
5. Order the tasks: domain first, then data, state and interface.
6. Group them by story, with a checkpoint at the end of each.
7. Every RF and every E appears in at least one task.
8. The last task is always the closing one: full verification, review, `summary.md` and status "Closed".

## Forbidden

- Writing code.
- Skipping the constitution or the architecture without an ADR.
- Leaving requirements or examples without a task.
- Adding scope that is not in the spec.

## Done when

- The constitution table has no breaches.
- Every RF and E is in some task.
- The "before" explanation is written.
