// T032: app-stores.ts wires the squad store to the database of src/data/database.ts (RF-013, RF-014).
// Expected API of src/state/app-stores.ts, which the Implementer writes:
//   getSquadStore(): the one squad store of the app, built on `getDatabase()` the first time it is
//   asked for and the same one every time after. Nothing is built at import time, because modules
//   load before initializeDatabase() has opened the database and getDatabase() throws until then.
import type * as AppStores from "@/state/app-stores";
import type { AppDatabase } from "@/data/database-types";
import { listTeams } from "@/data/team-repository";
import { createTestDatabase } from "../../tests/support/test-database";
import { ALEVIN } from "../../tests/support/squad-fixtures";

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

describe("app stores", () => {
  it("RF-013 RF-014: importing app-stores before the database is open throws nothing", () => {
    expect(() => loadStores()).not.toThrow();
  });

  it("RF-013 RF-014: once the database is open, the squad store saves in that database", () => {
    const stores = loadStores();
    mockGate.db = createTestDatabase();
    const result = stores.getSquadStore().getState().createTeam(ALEVIN);
    expect(result).toEqual({ kind: "saved" });
    expect(listTeams(mockGate.db).map((team) => team.name)).toEqual([
      "Alevín A",
    ]);
  });

  it("RF-013 RF-014: asking twice gives the same store, so every screen sees the same teams", () => {
    const stores = loadStores();
    mockGate.db = createTestDatabase();
    expect(stores.getSquadStore()).toBe(stores.getSquadStore());
  });
});
