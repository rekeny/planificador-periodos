/// <reference types="node" />
// Tests of the generated Android manifest when the unused permissions are blocked (T088, RF-011,
// constitution principle 3). The config comes from the real app.json and app.config.js, and the
// plugins run on a temporary project with `compileModsAsync`, as `expo prebuild` does. The starting
// manifest has the five permissions of the Expo template; fixtures are written at run time.
import {
  ALWAYS_BLOCKED,
  INTERNET,
  TEMPLATE_PERMISSIONS,
  TOOLS_NAMESPACE,
  applicationTag,
  entriesFor,
  manifestAsking,
  prebuildWithVariant,
  usesPermissions,
} from "./blocked-permissions-project";
import {
  ATTRIBUTE_FULL,
  ATTRIBUTE_RULES,
  FULL_BACKUP,
  MANIFEST,
  RULES,
  countOf,
  createProject,
  read,
  removeProjects,
  snapshot,
} from "./plugin-project";

afterEach(removeProjects);

const REMOVED = { node: "remove" };
const projectAsking = (permissions = TEMPLATE_PERMISSIONS): string =>
  createProject({}, manifestAsking(permissions));
const manifestOf = async (
  variant: string | undefined,
  permissions = TEMPLATE_PERMISSIONS,
): Promise<string> => {
  const project = projectAsking(permissions);
  await prebuildWithVariant(project, variant);
  return read(project, MANIFEST);
};

describe("blocked Android permissions, generated manifest", () => {
  describe("happy path", () => {
    it.each(ALWAYS_BLOCKED)(
      "RF-011: without APP_VARIANT %s has one uses-permission with tools:node=remove and no plain one",
      async (permission) => {
        const manifest = await manifestOf(undefined);

        expect(entriesFor(manifest, permission)).toEqual([
          { name: permission, ...REMOVED },
        ]);
      },
    );

    it("RF-011: without APP_VARIANT INTERNET stays as one plain uses-permission", async () => {
      const manifest = await manifestOf(undefined);

      expect(entriesFor(manifest, INTERNET)).toEqual([
        { name: INTERNET, node: undefined },
      ]);
    });

    it('RF-011: a blocked permission is written as <uses-permission android:name=... tools:node="remove"/> and tools is declared', async () => {
      const manifest = await manifestOf(undefined);

      for (const permission of ALWAYS_BLOCKED) {
        expect(manifest).toContain(
          `<uses-permission android:name="${permission}" tools:node="remove"/>`,
        );
      }
      expect(manifest).toContain(TOOLS_NAMESPACE);
    });
  });

  describe("boundaries", () => {
    it.each([...ALWAYS_BLOCKED, INTERNET])(
      "RF-011: with APP_VARIANT=production %s has one uses-permission with tools:node=remove and no plain one",
      async (permission) => {
        const manifest = await manifestOf("production");

        expect(entriesFor(manifest, permission)).toEqual([
          { name: permission, ...REMOVED },
        ]);
      },
    );

    it.each([undefined, "production"])(
      "RF-011 RF-088: with APP_VARIANT=%j allowBackup, dataExtractionRules and fullBackupContent are there once and the XML files exist",
      async (variant) => {
        const project = projectAsking();

        await prebuildWithVariant(project, variant);

        const manifest = read(project, MANIFEST);
        expect(countOf(manifest, 'android:allowBackup="false"')).toBe(1);
        expect(countOf(manifest, ATTRIBUTE_RULES)).toBe(1);
        expect(countOf(manifest, ATTRIBUTE_FULL)).toBe(1);
        expect(read(project, RULES)).toContain("<device-transfer>");
        expect(read(project, FULL_BACKUP)).toContain("<full-backup-content>");
      },
    );

    it("RF-011 RF-088: the <application> tag is the same with and without APP_VARIANT=production", async () => {
      const dev = applicationTag(await manifestOf(undefined));
      const production = applicationTag(await manifestOf("production"));

      expect(dev).toContain(ATTRIBUTE_RULES);
      expect(production).toBe(dev);
    });
  });

  describe("outside the rules", () => {
    it.each(["development", "preview", "Production", "production ", ""])(
      "RF-011: with APP_VARIANT=%j INTERNET stays as one plain uses-permission",
      async (variant) => {
        const manifest = await manifestOf(variant);

        expect(entriesFor(manifest, INTERNET)).toEqual([
          { name: INTERNET, node: undefined },
        ]);
      },
    );
  });

  describe("odd data", () => {
    it.each([
      ["only INTERNET", [INTERNET]],
      ["only VIBRATE and INTERNET", [INTERNET, ALWAYS_BLOCKED[1]]],
      ["no permissions", []],
    ])(
      "RF-011: a manifest with %s still ends with one tools:node=remove entry per blocked permission and no duplicate",
      async (_name, permissions) => {
        const manifest = await manifestOf("production", permissions);

        for (const permission of [...ALWAYS_BLOCKED, INTERNET]) {
          expect(entriesFor(manifest, permission)).toEqual([
            { name: permission, ...REMOVED },
          ]);
        }
        expect(usesPermissions(manifest)).toHaveLength(5);
      },
    );
  });

  describe("sequences", () => {
    it("RF-011: a second prebuild over the result gives the same files, with no duplicated uses-permission", async () => {
      const project = projectAsking();
      await prebuildWithVariant(project, "production");
      const first = snapshot(project);

      await prebuildWithVariant(project, "production");

      expect(snapshot(project)).toEqual(first);
      expect(usesPermissions(read(project, MANIFEST))).toHaveLength(5);
    });

    it("RF-011: production, then none, then production on fresh projects give each its own result", async () => {
      const internetOf = async (variant: string | undefined) =>
        entriesFor(await manifestOf(variant), INTERNET);

      expect(await internetOf("production")).toEqual([
        { name: INTERNET, ...REMOVED },
      ]);
      expect(await internetOf(undefined)).toEqual([
        { name: INTERNET, node: undefined },
      ]);
      expect(await internetOf("production")).toEqual([
        { name: INTERNET, ...REMOVED },
      ]);
    });
  });
});
