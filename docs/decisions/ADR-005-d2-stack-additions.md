# ADR-005 · Three packages added to the stack table for D2

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** Fernando, 2026-11-12 (chat)

## Context

The D2 review of spec 001 (`specs/001-planificador-v1/plan.md`, "New dependencies") found three packages that D2 needs and that `docs/architecture.md` does not list in its stack table. The table is part of the architecture, so adding them needs an approved ADR (constitution, `AGENTS.md` rule 11). The rest of D2's packages (expo-sqlite, Drizzle ORM, drizzle-kit, Zustand and react-native-gesture-handler) are already in the table.

## Decision

Add these rows to the stack table of `docs/architecture.md`:

| Piece          | Choice                    | What for                                                                              | Arrives in |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| Test database  | better-sqlite3 (dev only) | Run the real SQLite and the migrations in Jest, without the native expo-sqlite        | 001        |
| Native pickers | @expo/ui                  | Native date and time pickers of the new-match form (already installed in the project) | 001        |
| Splash screen  | expo-splash-screen        | Keep the splash screen visible until the database is ready and migrated               | 001        |

Each package is installed with `npx expo install` and its exact version is the one in `package-lock.json`. Their reasons and the version check are recorded in `plan.md`, "New dependencies".

## Consequences

- `better-sqlite3` is a development dependency with native code that needs Node 22 or later. It never ships in the app. Security reviews it in T024 with the rest of D2's dependencies.
- No principle of the constitution changes. None of the three packages makes network calls or sends data out of the device (principle 3).
- The table in `docs/architecture.md` stays the single list of the stack.
