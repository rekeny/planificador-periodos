// Codex fourth run, blocking finding 1 (RF-011, constitution principles 3 and 5): in a development
// build, `openDatabaseSync` registers the connection with Expo's dev inspector, a WebSocket that can
// export the file and return query results, children's names included. Installed mechanism
// (expo-sqlite 58.0.17): node_modules/expo-sqlite/src/SQLiteDatabase.ts lines 637-639 call
// `registerDatabaseForDevToolsAsync(database)` unless `options?.useNewConnection === true`, and
// SQLiteDevToolsClient.ts lines 44-50 / 64-71 only then open the plugin client (`__DEV__` only).
// `SQLiteOpenOptions.useNewConnection` is documented in NativeDatabase.ts line 52. The call may carry
// that options object, but never a `directory` (SEC-T026-3: the default backup-excluded folder).
import { sqliteDouble } from "../../tests/data/expo-sqlite-double";
import { launchApp } from "../../tests/data/database-fixtures";

const mockGetDevTools = jest.fn(() => Promise.resolve({}));

jest.mock("expo-sqlite", () =>
  jest.requireActual("../../tests/data/expo-sqlite-double"),
);
jest.mock("expo/devtools", () => ({
  getDevToolsPluginClientAsync: (...args: unknown[]) =>
    (mockGetDevTools as jest.Mock)(...args),
}));

beforeEach(() => {
  sqliteDouble.reset();
  mockGetDevTools.mockClear();
});

describe("database, kept out of the development inspector", () => {
  it("RF-011: the open call asks for its own connection, the option that skips the dev inspector", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    const [call] = sqliteDouble.openCalls();
    const options = call?.args[1] as { useNewConnection?: boolean } | undefined;
    expect(options?.useNewConnection).toBe(true);
  });

  it("RF-011 RF-082: the options carry no directory, so the default backup-excluded folder is still used (SEC-T026-3)", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    const [call] = sqliteDouble.openCalls();
    const args = call?.args ?? [];
    expect(args.length).toBeLessThanOrEqual(2);
    expect(args[2]).toBeUndefined();
    expect(Object.keys((args[1] as object | undefined) ?? {})).not.toContain(
      "directory",
    );
    expect(sqliteDouble.openCalls()).toHaveLength(1);
  });

  it("RF-011 RF-082: with the options added, foreign keys, WAL and the migrations still work", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    expect(sqliteDouble.appliedMigrations()).toBe(1);
    expect(sqliteDouble.tablesOnDisk()).toHaveLength(5);
    expect(sqliteDouble.statements().map((text) => text.toLowerCase())).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/pragma\s+foreign_keys\s*=\s*on/),
        expect.stringMatching(/pragma\s+journal_mode\s*=\s*wal/),
      ]),
    );
  });
});
