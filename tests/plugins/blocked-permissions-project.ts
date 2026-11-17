/// <reference types="node" />
// Helpers for the tests of the blocked Android permissions (T088, RF-011): the real app.json and
// app.config.js, a temporary Android project whose manifest has the five permissions of the Expo
// template, and a prebuild that applies the same plugins Expo's default prebuild applies
// (`withInternalBlockedPermissions`, `withPermissions`) plus our backup plugin. This file holds no
// test calls.
import { getConfig } from "expo/config";
import {
  AndroidConfig,
  compileModsAsync,
  type ExportedConfig,
} from "expo/config-plugins";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appJsonProblems } from "./backup-checks";
import { ROOT, loadPlugin } from "./plugin-project";

export const APP_CONFIG_FILE = join(ROOT, "app.config.js");
const PREFIX = "android.permission.";
export const INTERNET = `${PREFIX}INTERNET`;
export const ALWAYS_BLOCKED = [
  `${PREFIX}SYSTEM_ALERT_WINDOW`,
  `${PREFIX}VIBRATE`,
  `${PREFIX}READ_EXTERNAL_STORAGE`,
  `${PREFIX}WRITE_EXTERNAL_STORAGE`,
] as const;
export const TOOLS_NAMESPACE = 'xmlns:tools="http://schemas.android.com/tools"';

export type Expo = ExportedConfig;
type AppConfig = (context: { config: Expo; projectRoot: string }) => Expo;

/** The `expo` object of the real app.json, as Expo CLI hands it to app.config.js. */
export const readAppJsonExpo = (): Expo =>
  (JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as { expo: Expo })
    .expo;

/** The permissions the config blocks (empty when none). */
export const blockedOf = (config: Expo): string[] =>
  config.android?.blockedPermissions ?? [];

/** Evaluates the real app.config.js with a copy of app.json and APP_VARIANT set to `variant`. */
export function evaluateAppConfig(variant: string | undefined): Expo {
  expect(existsSync(APP_CONFIG_FILE)).toBe(true);
  const loaded = jest.requireActual<AppConfig | { default: AppConfig }>(
    APP_CONFIG_FILE,
  );
  const build = typeof loaded === "function" ? loaded : loaded.default;
  const before = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    return build({ config: readAppJsonExpo(), projectRoot: ROOT });
  } finally {
    if (before === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = before;
  }
}

/** What is wrong with the blocked permissions of `config`; empty when it is as T088 requires. */
export function blockedProblems(config: Expo, production: boolean): string[] {
  const blocked = blockedOf(config);
  const expected = production ? [...ALWAYS_BLOCKED, INTERNET] : ALWAYS_BLOCKED;
  const problems = blocked
    .filter((name) => !name.startsWith(PREFIX))
    .map((name) => `${name} is not a full permission name`);
  for (const name of expected)
    if (!blocked.includes(name)) problems.push(`${name} is not blocked`);
  if (!production && blocked.includes(INTERNET))
    problems.push("INTERNET is blocked without APP_VARIANT=production");
  return problems.concat(appJsonProblems({ expo: config }));
}

/** A manifest shaped like the Expo template's, asking for each of `permissions` in a plain tag. */
export function manifestAsking(permissions: readonly string[]): string {
  const asks = permissions
    .map((name) => `  <uses-permission android:name="${name}"/>\n`)
    .join("");
  return (
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    asks +
    '  <application android:name=".MainApplication" android:label="@string/app_name" ' +
    'android:allowBackup="false" android:theme="@style/AppTheme">\n' +
    '    <activity android:name=".MainActivity" android:exported="true"/>\n' +
    "  </application>\n</manifest>\n"
  );
}

export const TEMPLATE_PERMISSIONS: readonly string[] = [
  INTERNET,
  ...ALWAYS_BLOCKED,
];

/** One Android prebuild of the config app.config.js gives for `variant`, over `projectRoot`. */
export async function prebuildWithVariant(
  projectRoot: string,
  variant: string | undefined,
): Promise<void> {
  let config = AndroidConfig.Permissions.withInternalBlockedPermissions(
    evaluateAppConfig(variant),
  );
  config = AndroidConfig.Permissions.withPermissions(config, []);
  config = loadPlugin()(config);
  await compileModsAsync(config, { projectRoot, platforms: ["android"] });
}

export interface UsesPermission {
  readonly name: string | undefined;
  readonly node: string | undefined;
}

/** Every `<uses-permission>` tag of `manifest`, with its android:name and tools:node. */
export const usesPermissions = (manifest: string): UsesPermission[] =>
  [...manifest.matchAll(/<uses-permission\b[^>]*>/g)].map((match) => ({
    name: /android:name="([^"]*)"/.exec(match[0])?.[1],
    node: /tools:node="([^"]*)"/.exec(match[0])?.[1],
  }));

/** The tags of `manifest` that mention `name`. */
export const entriesFor = (manifest: string, name: string): UsesPermission[] =>
  usesPermissions(manifest).filter((entry) => entry.name === name);

/** The opening `<application ...>` tag. */
export const applicationTag = (manifest: string): string =>
  /<application\b[^>]*>/.exec(manifest)?.[0] ?? "";

/** What Expo CLI itself resolves from app.json plus app.config.js for `variant` (no plugins run). */
export function resolvedByExpo(variant: string | undefined): Expo {
  const before = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    return getConfig(ROOT, {
      skipSDKVersionRequirement: true,
      skipPlugins: true,
    }).exp as Expo;
  } finally {
    if (before === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = before;
  }
}
