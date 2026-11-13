/// <reference types="node" />
// Tests of plugins/with-backup-exclusion.js, Android part (T025, RF-088, E-028; E-028 itself is the
// device check). The plugin runs on a temporary project, as `expo prebuild` does. Fixtures are
// written at run time.
import {
  DOMAINS,
  excludesOf,
  extractionRulesProblems,
  fullBackupProblems,
  sectionOf,
} from "./backup-checks";
import {
  ATTRIBUTE_FULL,
  ATTRIBUTE_RULES,
  FULL_BACKUP,
  MANIFEST,
  PLUGIN_FILE,
  RULES,
  countOf,
  createProject,
  loadPlugin,
  manifestWith,
  prebuildAndroid,
  read,
  removeProjects,
  snapshot,
} from "./plugin-project";

afterEach(removeProjects);

const OTHER_XML = '<?xml version="1.0" encoding="utf-8"?>\n<other-rules/>\n';

describe("with-backup-exclusion plugin, Android", () => {
  describe("happy path", () => {
    it("RF-088 E-028: the plugin file exists and exports a config plugin function", () => {
      expect(PLUGIN_FILE).toMatch(/plugins\/with-backup-exclusion\.js$/);
      expect(typeof loadPlugin()).toBe("function");
    });

    it("RF-088 E-028: data_extraction_rules.xml has cloud-backup and device-transfer sections that exclude every domain", async () => {
      const project = createProject();

      await prebuildAndroid(project);

      expect(extractionRulesProblems(read(project, RULES))).toEqual([]);
    });

    it("RF-088 E-028: full_backup_content.xml excludes every domain", async () => {
      const project = createProject();

      await prebuildAndroid(project);

      expect(fullBackupProblems(read(project, FULL_BACKUP))).toEqual([]);
    });

    it("RF-088 E-028: the manifest gets android:dataExtractionRules and android:fullBackupContent and keeps allowBackup false", async () => {
      const project = createProject();

      await prebuildAndroid(project);

      const manifest = read(project, MANIFEST);
      expect(manifest).toContain(ATTRIBUTE_RULES);
      expect(manifest).toContain(ATTRIBUTE_FULL);
      expect(manifest).toContain('android:allowBackup="false"');
    });
  });

  describe("boundaries", () => {
    it.each(DOMAINS)(
      "RF-088 E-028: the domain %s is excluded in cloud-backup, in device-transfer and in full_backup_content.xml",
      async (domain) => {
        const project = createProject();

        await prebuildAndroid(project);

        const rules = read(project, RULES);
        expect(excludesOf(sectionOf(rules, "cloud-backup") ?? "", domain)).toBe(
          1,
        );
        expect(
          excludesOf(sectionOf(rules, "device-transfer") ?? "", domain),
        ).toBe(1);
        expect(
          excludesOf(
            sectionOf(read(project, FULL_BACKUP), "full-backup-content") ?? "",
            domain,
          ),
        ).toBe(1);
      },
    );
  });

  describe("odd data", () => {
    it("RF-088 E-028: running the plugin twice leaves one of each attribute and one exclusion per domain", async () => {
      const project = createProject();

      await prebuildAndroid(project);
      await prebuildAndroid(project);

      const manifest = read(project, MANIFEST);
      expect(countOf(manifest, "android:dataExtractionRules=")).toBe(1);
      expect(countOf(manifest, "android:fullBackupContent=")).toBe(1);
      expect(extractionRulesProblems(read(project, RULES))).toEqual([]);
      expect(fullBackupProblems(read(project, FULL_BACKUP))).toEqual([]);
    });

    it("RF-088 E-028: a manifest that already has both attributes from another plugin ends with one of each, ours", async () => {
      const project = createProject(
        {},
        manifestWith(
          ' android:dataExtractionRules="@xml/other_rules" android:fullBackupContent="@xml/other_content"',
        ),
      );

      await prebuildAndroid(project);

      const manifest = read(project, MANIFEST);
      expect(countOf(manifest, "android:dataExtractionRules=")).toBe(1);
      expect(countOf(manifest, "android:fullBackupContent=")).toBe(1);
      expect(manifest).toContain(ATTRIBUTE_RULES);
      expect(manifest).toContain(ATTRIBUTE_FULL);
      expect(manifest).not.toContain("@xml/other_");
    });

    it("RF-088 E-028: a res/xml folder that already holds other files keeps them untouched", async () => {
      const other = "android/app/src/main/res/xml/other_rules.xml";
      const project = createProject({ [other]: OTHER_XML });

      await prebuildAndroid(project);

      expect(read(project, other)).toBe(OTHER_XML);
      expect(extractionRulesProblems(read(project, RULES))).toEqual([]);
    });

    it("RF-088 E-028: a stale data_extraction_rules.xml from an earlier run is replaced, not extended", async () => {
      const project = createProject({ [RULES]: OTHER_XML });

      await prebuildAndroid(project);

      expect(read(project, RULES)).not.toContain("other-rules");
      expect(extractionRulesProblems(read(project, RULES))).toEqual([]);
    });
  });

  describe("sequences", () => {
    it("RF-088 E-028: prebuild, change nothing, prebuild again gives identical files", async () => {
      const project = createProject();

      await prebuildAndroid(project);
      const first = snapshot(project);
      await prebuildAndroid(project);

      expect(snapshot(project)).toEqual(first);
    });
  });
});
