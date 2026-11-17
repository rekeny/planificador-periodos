/// <reference types="node" />
// Helpers that run plugins/with-backup-exclusion.js (T025) on a temporary Android project, with
// the public API of expo/config-plugins (`compileModsAsync`), the same way `expo prebuild` does.
// The project is written at run time. This file holds no test calls.
import { compileModsAsync, type ExportedConfig } from "expo/config-plugins";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PLUGIN_PATH } from "./backup-checks";

export const ROOT = resolve(__dirname, "../..");
export const PLUGIN_FILE = join(ROOT, `${PLUGIN_PATH}.js`);

const MAIN = "android/app/src/main";
export const MANIFEST = `${MAIN}/AndroidManifest.xml`;
export const RULES = `${MAIN}/res/xml/data_extraction_rules.xml`;
export const FULL_BACKUP = `${MAIN}/res/xml/full_backup_content.xml`;

export const ATTRIBUTE_RULES =
  'android:dataExtractionRules="@xml/data_extraction_rules"';
export const ATTRIBUTE_FULL =
  'android:fullBackupContent="@xml/full_backup_content"';

const MANIFEST_HEAD =
  '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n' +
  '  <uses-permission android:name="android.permission.INTERNET"/>\n';

/** A manifest shaped like the Expo template's, with extra attributes on `<application>`. */
export function manifestWith(extraAttributes = ""): string {
  return (
    MANIFEST_HEAD +
    '  <application android:name=".MainApplication" android:label="@string/app_name" ' +
    `android:allowBackup="false" android:theme="@style/AppTheme"${extraAttributes}>\n` +
    '    <activity android:name=".MainActivity" android:exported="true"/>\n' +
    "  </application>\n</manifest>\n"
  );
}

const created: string[] = [];

/** A temporary project with an Android manifest and extra `files` (paths relative to it). */
export function createProject(
  files: Record<string, string> = {},
  manifest = manifestWith(),
): string {
  const root = mkdtempSync(join(tmpdir(), "backup-plugin-project-"));
  created.push(root);
  for (const [path, content] of Object.entries({
    [MANIFEST]: manifest,
    ...files,
  })) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

export function removeProjects(): void {
  for (const root of created.splice(0))
    rmSync(root, { recursive: true, force: true });
}

type Plugin = (config: ExportedConfig) => ExportedConfig;

/** The plugin function. Fails with a clear assertion while the file does not exist yet. */
export function loadPlugin(): Plugin {
  expect(existsSync(PLUGIN_FILE)).toBe(true);
  const loaded = jest.requireActual<Plugin | { default: Plugin }>(PLUGIN_FILE);
  return typeof loaded === "function" ? loaded : loaded.default;
}

/** One Android `prebuild` of the plugin over `projectRoot` (it may be run again over the result). */
export async function prebuildAndroid(projectRoot: string): Promise<void> {
  const config = loadPlugin()({
    name: "Test app",
    slug: "test-app",
    android: { package: "com.example.test", allowBackup: false },
  });
  await compileModsAsync(config, { projectRoot, platforms: ["android"] });
}

export const read = (projectRoot: string, path: string): string =>
  readFileSync(join(projectRoot, path), "utf8");

/** Every file under `projectRoot` with its content, to compare two runs. */
export function snapshot(projectRoot: string): Record<string, string> {
  const result: Record<string, string> = {};
  const walk = (folder: string): void => {
    for (const name of readdirSync(join(projectRoot, folder)).sort()) {
      const relative = join(folder, name);
      if (statSync(join(projectRoot, relative)).isDirectory()) walk(relative);
      else result[relative] = read(projectRoot, relative);
    }
  };
  walk(".");
  return result;
}

/** How many times `needle` appears in `text`. */
export const countOf = (text: string, needle: string): number =>
  text.split(needle).length - 1;
