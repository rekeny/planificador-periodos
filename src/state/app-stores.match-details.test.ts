// T095: app-stores.ts builds a new match details draft on every call (RF-082, D3 rule 4). Expected
// API of src/state/app-stores.ts, which the Implementer adds: newMatchDetailsDraft(matchId), a
// function (not a one-store getter like getMatchesStore) that returns createMatchDetailsDraft on
// `getDatabase()`. Each details screen owns its draft, so two calls never give the same store.
import type * as AppStores from "@/state/app-stores";
import type { AppDatabase } from "@/data/database-types";
import { getMatch } from "@/data/match-repository";
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

// Each test loads app-stores again, so nothing of one test is left for the next.
function loadStores(): typeof AppStores {
  jest.resetModules();
  return jest.requireActual<typeof AppStores>("@/state/app-stores");
}

function openDatabase() {
  const db = createTestDatabase();
  const teamId = addTeam(db, { name: "Alevín A" });
  const matchId = addMatch(db, teamId, { homeName: "Local", notes: "Pista 2" });
  mockGate.db = db;
  return { db, matchId };
}

beforeEach(() => {
  mockGate.db = undefined;
});

describe("app stores, the match details draft", () => {
  it("RF-082: asking for a draft before the database is open throws only when asked, never at import", () => {
    const stores = loadStores();
    expect(() => stores.newMatchDetailsDraft(1)).toThrow(
      "The database is not open yet",
    );
  });

  it("RF-028: once the database is open, the draft holds the details of that match", () => {
    const stores = loadStores();
    const { matchId } = openDatabase();
    expect(stores.newMatchDetailsDraft(matchId).getState()).toMatchObject({
      status: "ready",
      homeName: "Local",
      notes: "Pista 2",
    });
  });

  it("RF-082: asking twice for the same match gives two different drafts, never a shared one", () => {
    const stores = loadStores();
    const { matchId } = openDatabase();
    expect(stores.newMatchDetailsDraft(matchId)).not.toBe(
      stores.newMatchDetailsDraft(matchId),
    );
  });

  it("RF-082: what is typed in one draft does not reach another draft of the same match", () => {
    const stores = loadStores();
    const { matchId } = openDatabase();
    const first = stores.newMatchDetailsDraft(matchId);
    const second = stores.newMatchDetailsDraft(matchId);
    first.getState().setHomeName("Escrito");
    expect(second.getState().homeName).toBe("Local");
  });

  it("RF-028 RF-082: a draft saved through the app's function writes the database that is open", () => {
    const stores = loadStores();
    const { db, matchId } = openDatabase();
    const draft = stores.newMatchDetailsDraft(matchId);
    draft.getState().setNotes("Guardado");
    expect(draft.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)?.notes).toBe("Guardado");
    expect(stores.newMatchDetailsDraft(matchId).getState().notes).toBe(
      "Guardado",
    );
  });

  it("RF-028: a match that does not exist gives a draft with status notFound", () => {
    const stores = loadStores();
    const { matchId } = openDatabase();
    expect(stores.newMatchDetailsDraft(matchId + 1).getState().status).toBe(
      "notFound",
    );
  });
});
