/// <reference types="node" />
// Helpers for the iOS tests of plugins/with-backup-exclusion.js (T026). They build on the T025
// helpers: the same temporary project, now with an AppDelegate.swift, and the same public API of
// expo/config-plugins (`compileModsAsync`). Fixtures are written at run time. This file holds no
// test calls.
import { compileModsAsync } from "expo/config-plugins";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadPlugin } from "./plugin-project";

export const APP_DELEGATE = "ios/App/AppDelegate.swift";

/** Where the Swift code starts React Native in the SDK 58 template (the line the exclusion must precede). */
export const FACTORY_LINE = "ExpoReactNativeFactory(";

const SIGNATURE =
  "  public override func application(\n" +
  "    _ application: UIApplication,\n" +
  "    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil\n" +
  "  ) -> Bool {\n";
const FACTORY =
  "    let delegate = ReactNativeDelegate()\n" +
  `    let factory = ${FACTORY_LINE}delegate: delegate)\n` +
  "    delegate.dependencyProvider = RCTAppDependencyProvider()\n\n" +
  "    reactNativeDelegate = delegate\n" +
  "    reactNativeFactory = factory\n";
const START =
  "    window = UIWindow(frame: UIScreen.main.bounds)\n" +
  "    factory.startReactNative(\n" +
  '      withModuleName: "main",\n      in: window,\n      launchOptions: launchOptions)\n';
const RETURN =
  "    return super.application(application, didFinishLaunchingWithOptions: launchOptions)\n";

const HEAD = "internal import Expo\nimport React\n\n@main\n";
const CLASS =
  "class AppDelegate: ExpoAppDelegate {\n  var window: UIWindow?\n\n";
const TAIL =
  "  }\n}\n\nclass ReactNativeDelegate: ExpoReactNativeFactoryDelegate {\n}\n";

/** AppDelegate.swift as the SDK 58 template writes it (React Native starts in SceneDelegate). */
export const templateSwift = (): string =>
  HEAD + CLASS + SIGNATURE + FACTORY + "\n" + RETURN + TAIL;

/** AppDelegate.swift of a template that starts React Native inside `application(_:didFinish...)`. */
export const startsInAppDelegateSwift = (): string =>
  HEAD + CLASS + SIGNATURE + FACTORY + START + RETURN + TAIL;

/** The same template with its lines re-indented (`unit` replaces each two-space step). */
export const reindented = (source: string, unit: string): string =>
  source.replace(/^( +)/gm, (spaces) => unit.repeat(spaces.length / 2));

/** An AppDelegate.swift in which the launch function is gone, so no anchor can exist. */
export const withoutLaunchFunctionSwift = (): string =>
  HEAD + CLASS + "  func somethingElse() {}\n}\n";

/** One iOS `prebuild` of the plugin over `projectRoot`; `platforms` adds Android for the mixed run. */
export async function prebuildIos(
  projectRoot: string,
  platforms: ("ios" | "android")[] = ["ios"],
): Promise<void> {
  const config = loadPlugin()({
    name: "Test app",
    slug: "test-app",
    ios: { bundleIdentifier: "com.example.test" },
    android: { package: "com.example.test", allowBackup: false },
  });
  await compileModsAsync(config, { projectRoot, platforms });
}

/** Lines of the generated block (`@generated begin` ... `@generated end`) and the file without it. */
export function splitGenerated(swift: string): {
  block: string;
  rest: string;
  begins: number;
  ends: number;
} {
  const lines = swift.split("\n");
  const start = lines.findIndex((line) => line.includes("@generated begin"));
  const end = lines.findIndex((line) => line.includes("@generated end"));
  const found = start >= 0 && end >= start;
  return {
    block: found ? lines.slice(start, end + 1).join("\n") : "",
    rest: found
      ? [...lines.slice(0, start), ...lines.slice(end + 1)].join("\n")
      : swift,
    begins: lines.filter((line) => line.includes("@generated begin")).length,
    ends: lines.filter((line) => line.includes("@generated end")).length,
  };
}

const SEARCH_PATHS: Record<string, string> = {
  documentDirectory: ".documentDirectory",
  cacheDirectory: ".cachesDirectory",
};

/**
 * The folder the installed expo-sqlite uses by default, read from its iOS source (the `#else` branch
 * of `defaultDatabaseDirectory`, which is every platform but tvOS): the Swift search-path name and
 * the folder name appended to it.
 */
export function installedSqliteDirectory(): {
  searchPath: string;
  folder: string;
} {
  const source = readFileSync(
    join(ROOT, "node_modules/expo-sqlite/ios/SQLiteModule.swift"),
    "utf8",
  );
  const match =
    /var defaultDatabaseDirectory[\s\S]*?#else\s*return appContext\?\.config\.(\w+)\?\.appendingPathComponent\("([^"]+)"\)/.exec(
      source,
    );
  const searchPath = match?.[1] ? SEARCH_PATHS[match[1]] : undefined;
  if (!match?.[2] || !searchPath)
    throw new Error("expo-sqlite defaultDatabaseDirectory was not understood");
  return { searchPath, folder: match[2] };
}
