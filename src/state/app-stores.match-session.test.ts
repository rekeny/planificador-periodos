// T041: app-stores.ts wires the match session store to the database of src/data/database.ts.
// Expected API of src/state/app-stores.ts, which the Implementer adds (same pattern as
// getSquadStore and getNewMatchDraft): getMatchSessionStore(), the one match session store of the
// app, built on `getDatabase()` the first time it is asked for and the same one every time after.
import type * as AppStores from "@/state/app-stores";
import type { AppDatabase } from "@/data/database-types";
import {
  sessionWith,
  squadSpecs,
} from "../../tests/support/match-session-fixtures";

const mockGate: { db: AppDatabase | undefined } = { db: undefined };

jest.mock("@/data/database", () => ({
  getDatabase: () => {
    if (mockGate.db === undefined) {
      throw new Error("The database is not open yet");
    }
    return mockGate.db;
  },
  openAppDatabase: () => Promise.resolve(),
}));

function loadStores(): typeof AppStores {
  jest.resetModules();
  return jest.requireActual<typeof AppStores>("@/state/app-stores");
}

beforeEach(() => {
  mockGate.db = undefined;
});

describe("app stores, match session", () => {
  it("RF-042: asking for the match session store before the database is open throws only when asked, never at import", () => {
    const stores = loadStores();
    expect(() => stores.getMatchSessionStore()).toThrow(
      "The database is not open yet",
    );
  });

  it("RF-042: once the database is open, the match session store opens the matches of that database", () => {
    const stores = loadStores();
    const { db, matchId } = sessionWith(squadSpecs(9));
    mockGate.db = db;
    const store = stores.getMatchSessionStore();
    store.getState().openMatch(matchId);
    expect(store.getState().status).toBe("open");
    expect(store.getState().view?.rows).toHaveLength(9);
  });

  it("RF-042: asking twice gives the same store, so every screen sees the same open match", () => {
    const stores = loadStores();
    mockGate.db = sessionWith(squadSpecs(9)).db;
    expect(stores.getMatchSessionStore()).toBe(stores.getMatchSessionStore());
  });
});
