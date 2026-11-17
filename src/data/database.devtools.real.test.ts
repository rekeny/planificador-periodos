// Codex fourth run, blocking finding 1 (RF-011, constitution principles 3 and 5), with the REAL
// `openDatabaseSync` of expo-sqlite 58 (only its native module and the dev-tools plugin are replaced):
// in development (`__DEV__` is true in Jest) opening the app's database must not start the dev
// inspector client, which would let a WebSocket export the file and run queries (children's names).
// Mechanism: node_modules/expo-sqlite/build/SQLiteDatabase.js, the `useNewConnection !== true` guard
// around `registerDatabaseForDevToolsAsync`; node_modules/expo-sqlite/src/SQLiteDevToolsClient.ts
// line 66-68 is where `getDevToolsPluginClientAsync` would be called.
import { openAppDatabase } from "@/data/database";

const mockGetDevTools = jest.fn(() =>
  Promise.resolve({ addMessageListener: () => ({ remove: () => {} }) }),
);

jest.mock("../../node_modules/expo-sqlite/build/ExpoSQLite", () => {
  class NativeDatabase {
    initSync(): void {}
    execSync(): void {}
    closeSync(): void {}
  }
  return {
    __esModule: true,
    default: {
      NativeDatabase,
      ensureDatabasePathExistsSync: () => {},
      defaultDatabaseDirectory: "/default/SQLite",
    },
  };
});
jest.mock("expo/devtools", () => ({
  getDevToolsPluginClientAsync: (...args: unknown[]) =>
    (mockGetDevTools as jest.Mock)(...args),
}));

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 20));

describe("database, real expo-sqlite in development", () => {
  it("RF-011: this build runs with __DEV__ on, the case in which the inspector would register", () => {
    expect(__DEV__).toBe(true);
  });

  it("RF-011: opening the app's database never starts the dev inspector client", async () => {
    // The fake native layer cannot run the migrations: the open may fail afterwards, and that is fine.
    await openAppDatabase().catch(() => undefined);
    await settle();
    expect(mockGetDevTools).not.toHaveBeenCalled();
  });
});
