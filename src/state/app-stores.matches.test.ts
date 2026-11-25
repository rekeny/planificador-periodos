// T069: app-stores.ts wires the matches store to the database of src/data/database.ts (RF-074,
// RF-075). Expected API of src/state/app-stores.ts, which the Implementer adds (same pattern as
// getSquadStore and getMatchSessionStore): getMatchesStore(), the one matches store of the app,
// built on `getDatabase()` the first time it is asked for and the same one every time after.
import type * as AppStores from "@/state/app-stores";
import type { AppDatabase } from "@/data/database-types";
import { addMatch, addTeam } from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

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

// Each test loads app-stores again, so the store of one test is never the store of the next.
function loadStores(): typeof AppStores {
  jest.resetModules();
  return jest.requireActual<typeof AppStores>("@/state/app-stores");
}

beforeEach(() => {
  mockGate.db = undefined;
});

describe("app stores, matches", () => {
  it("RF-074 RF-075: asking for the matches store before the database is open throws only when asked, never at import", () => {
    const stores = loadStores();
    expect(() => stores.getMatchesStore()).toThrow(
      "The database is not open yet",
    );
  });

  it("RF-074 RF-075: once the database is open, the matches store lists the matches of that database", () => {
    const stores = loadStores();
    const db = createTestDatabase();
    const team = addTeam(db, { name: "Alevín A", category: "Alevín" });
    addMatch(db, team, { date: "2026-11-11" });
    mockGate.db = db;
    const store = stores.getMatchesStore();
    store.getState().loadAll();
    store.getState().loadTeam(team);
    expect(store.getState().allMatches.map((item) => item.date)).toEqual([
      "11/11/2026",
    ]);
    expect(store.getState().teamMatches?.items).toHaveLength(1);
  });

  it("RF-074 RF-075: asking twice gives the same store, so every screen sees the same lists", () => {
    const stores = loadStores();
    mockGate.db = createTestDatabase();
    expect(stores.getMatchesStore()).toBe(stores.getMatchesStore());
  });
});
