/// <reference types="node" />
// Tests of plugins/with-backup-exclusion.js, iOS part (T026, RF-088, E-028; E-028 itself is the
// device check on the simulator). The plugin runs on a temporary project, as `expo prebuild` does.
// AppDelegate.swift fixtures are written at run time.
import {
  APP_DELEGATE,
  FACTORY_LINE,
  installedSqliteDirectory,
  prebuildIos,
  reindented,
  splitGenerated,
  startsInAppDelegateSwift,
  templateSwift,
  withoutLaunchFunctionSwift,
} from "./plugin-project-ios";
import {
  FULL_BACKUP,
  MANIFEST,
  RULES,
  createProject,
  read,
  removeProjects,
  snapshot,
} from "./plugin-project";
import { existsSync } from "node:fs";
import { join } from "node:path";

afterEach(removeProjects);

const swiftProject = (swift = templateSwift()): string =>
  createProject({ [APP_DELEGATE]: swift });
const MARKER = "@generated begin";
const SIGNATURE = "didFinishLaunchingWithOptions launchOptions";

describe("with-backup-exclusion plugin, iOS", () => {
  describe("happy path", () => {
    it("RF-088 E-028: the merged AppDelegate.swift creates the database folder and sets isExcludedFromBackup inside a tagged block", async () => {
      const project = swiftProject();

      await prebuildIos(project);

      const { block, begins, ends } = splitGenerated(
        read(project, APP_DELEGATE),
      );
      expect(begins).toBe(1);
      expect(ends).toBe(1);
      expect(block).toContain("createDirectory(");
      expect(block).toContain("withIntermediateDirectories: true");
      expect(block).toContain("isExcludedFromBackup = true");
      expect(block).toContain("setResourceValues");
    });

    it("RF-088 E-028: the exclusion code sits inside the launch function, after its signature", async () => {
      const project = swiftProject();

      await prebuildIos(project);

      const swift = read(project, APP_DELEGATE);
      expect(swift.indexOf(MARKER)).toBeGreaterThan(swift.indexOf(SIGNATURE));
    });
  });

  describe("boundaries", () => {
    it("RF-088 E-028: the folder is created before it is excluded, so a first launch with no folder still ends excluded", async () => {
      const project = swiftProject();

      await prebuildIos(project);

      const { block } = splitGenerated(read(project, APP_DELEGATE));
      expect(block.indexOf("createDirectory(")).toBeGreaterThanOrEqual(0);
      expect(block.indexOf("isExcludedFromBackup")).toBeGreaterThan(
        block.indexOf("createDirectory("),
      );
    });

    it("RF-088 E-028: the generated code never deletes or moves a file, so an existing folder with a WAL file keeps its content", async () => {
      const project = swiftProject();

      await prebuildIos(project);

      const { block } = splitGenerated(read(project, APP_DELEGATE));
      expect(block).toContain("isExcludedFromBackup");
      expect(block).not.toMatch(/removeItem|trashItem|moveItem|replaceItem/);
    });

    it("RF-088 E-028: the folder in the Swift code is the defaultDatabaseDirectory of the installed expo-sqlite", async () => {
      const project = swiftProject();
      const { searchPath, folder } = installedSqliteDirectory();

      await prebuildIos(project);

      const { block } = splitGenerated(read(project, APP_DELEGATE));
      expect(block).toContain(searchPath);
      expect(block).toContain(`"${folder}"`);
    });

    it("RF-088 E-028: the Library/Caches folder is never used, because iOS may empty it", async () => {
      const project = swiftProject();

      await prebuildIos(project);

      const { block } = splitGenerated(read(project, APP_DELEGATE));
      expect(block).toContain("isExcludedFromBackup");
      expect(block).not.toMatch(/cachesDirectory|cacheDirectory|Caches/i);
    });
  });

  describe("odd data", () => {
    it("RF-088 E-028: running prebuild twice leaves each tag marker exactly once", async () => {
      const project = swiftProject();

      await prebuildIos(project);
      await prebuildIos(project);

      const { begins, ends, block } = splitGenerated(
        read(project, APP_DELEGATE),
      );
      expect(begins).toBe(1);
      expect(ends).toBe(1);
      expect(block).toContain("isExcludedFromBackup");
    });

    it("RF-088 E-028: everything outside the tagged block is left as the template wrote it", async () => {
      const project = swiftProject();

      await prebuildIos(project);

      const { rest, begins } = splitGenerated(read(project, APP_DELEGATE));
      expect(begins).toBe(1);
      expect(rest).toBe(templateSwift());
    });

    it.each([
      ["four-space steps", "    "],
      ["tabs", "\t"],
    ])(
      "RF-088 E-028: an AppDelegate.swift indented with %s is either merged exactly once or makes the plugin throw, never skipped",
      async (_name, unit) => {
        const project = swiftProject(reindented(templateSwift(), unit));

        const outcome = await prebuildIos(project).then(
          () => "merged",
          () => "threw",
        );

        const { begins, block } = splitGenerated(read(project, APP_DELEGATE));
        if (outcome === "merged") {
          expect(begins).toBe(1);
          expect(block).toContain("isExcludedFromBackup = true");
        } else {
          expect(begins).toBe(0);
        }
      },
    );
  });

  describe("sequences", () => {
    it("RF-088 E-028: prebuild, change nothing, prebuild again gives identical files", async () => {
      const project = swiftProject();

      await prebuildIos(project);
      const first = snapshot(project);
      await prebuildIos(project);

      expect(read(project, APP_DELEGATE)).toContain("isExcludedFromBackup");
      expect(snapshot(project)).toEqual(first);
    });
  });

  describe("interruptions", () => {
    it.each([
      ["the SDK 58 template", templateSwift()],
      [
        "a template that starts React Native in the launch function",
        startsInAppDelegateSwift(),
      ],
    ])(
      "RF-088 E-028: in %s the exclusion comes before the React Native start-up, so a first launch killed after the folder is created is still excluded",
      async (_name, swift) => {
        const project = swiftProject(swift);

        await prebuildIos(project);

        const merged = read(project, APP_DELEGATE);
        const exclusion = merged.indexOf("isExcludedFromBackup");
        expect(exclusion).toBeGreaterThan(merged.indexOf(SIGNATURE));
        expect(exclusion).toBeLessThan(merged.indexOf(FACTORY_LINE));
        expect(exclusion).toBeLessThan(
          merged.indexOf("return super.application("),
        );
        if (merged.includes("startReactNative(")) {
          expect(exclusion).toBeLessThan(merged.indexOf("startReactNative("));
        }
      },
    );
  });

  describe("mistakes", () => {
    it("RF-088 E-028: an AppDelegate.swift without the launch function makes the plugin throw and says which anchor is missing", async () => {
      const project = swiftProject(withoutLaunchFunctionSwift());

      const result = prebuildIos(project);

      await expect(result).rejects.toThrow(/AppDelegate\.swift/);
      await expect(result).rejects.toThrow(/anchor/i);
      expect(read(project, APP_DELEGATE)).toBe(withoutLaunchFunctionSwift());
    });

    it("RF-088 E-028: an Objective-C AppDelegate.mm, which has no Swift anchor, makes the plugin throw instead of skipping", async () => {
      const objc = "@implementation AppDelegate\n@end\n";
      const project = createProject({ "ios/App/AppDelegate.mm": objc });

      await expect(prebuildIos(project)).rejects.toThrow(/anchor/i);
    });

    it("RF-088 E-028: an iOS-only prebuild merges AppDelegate.swift and writes no Android file", async () => {
      const project = swiftProject();
      const manifestBefore = read(project, MANIFEST);

      await prebuildIos(project, ["ios"]);

      expect(read(project, APP_DELEGATE)).toContain("isExcludedFromBackup");
      expect(existsSync(join(project, RULES))).toBe(false);
      expect(existsSync(join(project, FULL_BACKUP))).toBe(false);
      expect(read(project, MANIFEST)).toBe(manifestBefore);
    });

    it("RF-088 E-028: adding the iOS part leaves the Android output identical to an Android-only prebuild", async () => {
      const androidOnly = swiftProject();
      const both = swiftProject();

      await prebuildIos(androidOnly, ["android"]);
      await prebuildIos(both, ["ios", "android"]);

      expect(read(both, APP_DELEGATE)).toContain("isExcludedFromBackup");
      expect(read(androidOnly, APP_DELEGATE)).toBe(templateSwift());
      for (const path of [MANIFEST, RULES, FULL_BACKUP]) {
        expect(read(both, path)).toBe(read(androidOnly, path));
      }
    });
  });
});
