// The replacement of `@/state/app-stores` for screen tests (T034 and the screen tests after it):
// `jest.mock("@/state/app-stores", () => jest.requireActual("../support/mock-app-stores")
// .mockAppStoresModule())`. A test gives the store its screens read with `useMockSquadStore`,
// usually a real store on the in-memory database of `mock-database.ts`. This file holds no tests.
import type { AppDatabase } from "@/data/database-types";
import { createMatchesStore } from "@/state/matches-store";
import type { MatchesStore } from "@/state/matches-store";
import { mockDatabaseModule } from "./mock-database";
import type { MatchSessionStore } from "./match-session-fixtures";
import type { NewMatchDraft } from "./new-match-fixtures";
import type { SquadStore } from "./squad-fixtures";

let current: SquadStore | undefined;
let currentDraft: NewMatchDraft | undefined;
let currentSession: MatchSessionStore | undefined;
let currentMatches: MatchesStore | undefined;
let fallbackMatches: { db: AppDatabase; store: MatchesStore } | undefined;

/** The squad store that `getSquadStore()` hands out from now on. */
export function useMockSquadStore(store: SquadStore): void {
  current = store;
}

/** The new-match draft that `getNewMatchDraft()` hands out from now on (T043). Not named `use…`: ESLint would read it as a hook. */
export function setMockNewMatchDraft(draft: NewMatchDraft): void {
  currentDraft = draft;
}

/** The match session store that `getMatchSessionStore()` hands out from now on (T046). Not named `use…`, like the draft. */
export function setMockMatchSessionStore(store: MatchSessionStore): void {
  currentSession = store;
}

/** The matches store (the two lists of matches) that `getMatchesStore()` hands out from now on (T071). Not named `use…`, like the others. */
export function setMockMatchesStore(store: MatchesStore): void {
  currentMatches = store;
}

// The team screen (T099) reads the matches store on every focus, so a test that never gave one still
// gets a real store, on the mock database as it is now. It is rebuilt when `resetMockDatabase()`
// gave a new database, so the D2 screen tests keep running unchanged.
function fallbackMatchesStore(): MatchesStore {
  const db = mockDatabaseModule().getDatabase();
  if (fallbackMatches?.db !== db) {
    fallbackMatches = { db, store: createMatchesStore(db) };
  }
  return fallbackMatches.store;
}

export function mockAppStoresModule(): {
  getSquadStore: () => SquadStore;
  getNewMatchDraft: () => NewMatchDraft;
  getMatchSessionStore: () => MatchSessionStore;
  getMatchesStore: () => MatchesStore;
} {
  return {
    getMatchesStore: () => currentMatches ?? fallbackMatchesStore(),
    getMatchSessionStore: () => {
      if (currentSession === undefined) {
        throw new Error("The test gave no match session store");
      }
      return currentSession;
    },
    getNewMatchDraft: () => {
      if (currentDraft === undefined) {
        throw new Error("The test gave no new-match draft");
      }
      return currentDraft;
    },
    getSquadStore: () => {
      if (current === undefined) {
        throw new Error("The test gave no squad store");
      }
      return current;
    },
  };
}
