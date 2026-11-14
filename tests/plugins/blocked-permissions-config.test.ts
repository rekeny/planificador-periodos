/// <reference types="node" />
// Tests of the versioned configuration that blocks the unused Android permissions (T088, RF-011,
// constitution principle 3): app.json, and app.config.js, which adds INTERNET to the blocked ones
// only when APP_VARIANT is exactly "production". The real files are read; broken configs are built
// at run time.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appJsonProblems } from "./backup-checks";
import {
  ALWAYS_BLOCKED,
  APP_CONFIG_FILE,
  INTERNET,
  blockedOf,
  blockedProblems,
  evaluateAppConfig,
  readAppJsonExpo,
  resolvedByExpo,
} from "./blocked-permissions-project";
import { ROOT } from "./plugin-project";

const NOT_PRODUCTION = [
  undefined,
  "development",
  "preview",
  "Production",
  "production ",
  "",
  "staging",
];
const withoutBlocked = ({
  android,
  ...rest
}: ReturnType<typeof evaluateAppConfig>) => ({
  ...rest,
  android: { ...android, blockedPermissions: undefined },
});

describe("blocked Android permissions, app.json", () => {
  describe("happy path", () => {
    it.each(ALWAYS_BLOCKED)(
      "RF-011: app.json android.blockedPermissions contains %s",
      (permission) => {
        expect(blockedOf(readAppJsonExpo())).toContain(permission);
      },
    );

    it("RF-011: app.json does not block INTERNET, so the dev client can reach Metro", () => {
      expect(blockedOf(readAppJsonExpo())).not.toContain(INTERNET);
      expect(blockedOf(readAppJsonExpo())).not.toContain("INTERNET");
    });

    it("RF-011 RF-088: app.json blocks exactly the four permissions, with full names, and still keeps allowBackup false and the backup plugin once", () => {
      expect(blockedProblems(readAppJsonExpo(), false)).toEqual([]);
      expect([...blockedOf(readAppJsonExpo())].sort()).toEqual(
        [...ALWAYS_BLOCKED].sort(),
      );
    });
  });

  describe("mistakes", () => {
    it("RF-011: a permission written with its short name fails the check", () => {
      const config = readAppJsonExpo();
      config.android = { ...config.android, blockedPermissions: ["VIBRATE"] };

      expect(blockedProblems(config, false)).not.toEqual([]);
    });

    it("RF-011: INTERNET blocked without the production variable fails the check", () => {
      const config = readAppJsonExpo();
      config.android = {
        ...config.android,
        blockedPermissions: [...ALWAYS_BLOCKED, INTERNET],
      };

      expect(blockedProblems(config, false)).not.toEqual([]);
    });

    it("RF-011 RF-088: allowBackup true, or the backup plugin dropped, fails the check", () => {
      const config = readAppJsonExpo();
      const backupOff = {
        ...config,
        android: { ...config.android, allowBackup: true },
      };
      const noPlugin = { ...config, plugins: [] };

      expect(blockedProblems(backupOff, false)).not.toEqual([]);
      expect(blockedProblems(noPlugin, false)).not.toEqual([]);
    });
  });
});

describe("blocked Android permissions, app.config.js", () => {
  describe("happy path", () => {
    it("RF-011: app.config.js exists at the project root and exports a function that takes { config }", () => {
      expect(readdirSync(ROOT)).toContain("app.config.js");
      expect(typeof jest.requireActual(APP_CONFIG_FILE)).toBe("function");
    });

    it("RF-011: without APP_VARIANT the config blocks the four permissions and not INTERNET", () => {
      const config = evaluateAppConfig(undefined);

      expect([...blockedOf(config)].sort()).toEqual([...ALWAYS_BLOCKED].sort());
      expect(blockedProblems(config, false)).toEqual([]);
    });
  });

  describe("boundaries", () => {
    it("RF-011: with APP_VARIANT=production the config blocks the four permissions and INTERNET once", () => {
      const config = evaluateAppConfig("production");

      expect([...blockedOf(config)].sort()).toEqual(
        [...ALWAYS_BLOCKED, INTERNET].sort(),
      );
      expect(blockedProblems(config, true)).toEqual([]);
    });
  });

  describe("outside the rules", () => {
    it.each(NOT_PRODUCTION)(
      "RF-011: APP_VARIANT=%j keeps INTERNET unblocked and the other four blocked",
      (variant) => {
        const config = evaluateAppConfig(variant);

        expect(blockedOf(config)).not.toContain(INTERNET);
        expect(blockedProblems(config, false)).toEqual([]);
      },
    );
  });

  describe("odd data", () => {
    it.each([undefined, "production"])(
      "RF-011 RF-088: with APP_VARIANT=%j nothing but blockedPermissions differs from app.json",
      (variant) => {
        expect(withoutBlocked(evaluateAppConfig(variant))).toEqual(
          withoutBlocked(readAppJsonExpo()),
        );
      },
    );

    it.each([undefined, "production"])(
      "RF-011 RF-088: with APP_VARIANT=%j the config keeps name, scheme, allowBackup false and the backup plugin once",
      (variant) => {
        const config = evaluateAppConfig(variant);

        expect(config.name).toBe("Planificador de periodos");
        expect(config.scheme).toBe("planificadorperiodos");
        expect(config.android?.allowBackup).toBe(false);
        expect(config.plugins).toContain("./plugins/with-backup-exclusion.js");
        expect(appJsonProblems({ expo: config })).toEqual([]);
      },
    );
  });

  describe("sequences", () => {
    it("RF-011: the variable is read at every evaluation: production, then none, then production again", () => {
      expect(blockedOf(evaluateAppConfig("production"))).toContain(INTERNET);
      expect(blockedOf(evaluateAppConfig(undefined))).not.toContain(INTERNET);
      expect(blockedOf(evaluateAppConfig("production"))).toContain(INTERNET);
    });

    it("RF-011: evaluating the config does not change app.json or the next evaluation", () => {
      const before = readFileSync(join(ROOT, "app.json"), "utf8");

      evaluateAppConfig("production");

      expect(readFileSync(join(ROOT, "app.json"), "utf8")).toBe(before);
      expect(blockedOf(readAppJsonExpo())).not.toContain(INTERNET);
    });
  });

  describe("Expo CLI", () => {
    it("RF-011: Expo resolves app.json plus app.config.js without INTERNET blocked when APP_VARIANT is not set", () => {
      const resolved = resolvedByExpo(undefined);

      expect(resolved.name).toBe("Planificador de periodos");
      expect([...blockedOf(resolved)].sort()).toEqual(
        [...ALWAYS_BLOCKED].sort(),
      );
    });

    it("RF-011: Expo resolves app.json plus app.config.js with INTERNET blocked when APP_VARIANT=production", () => {
      const resolved = resolvedByExpo("production");

      expect(resolved.name).toBe("Planificador de periodos");
      expect([...blockedOf(resolved)].sort()).toEqual(
        [...ALWAYS_BLOCKED, INTERNET].sort(),
      );
    });
  });
});
