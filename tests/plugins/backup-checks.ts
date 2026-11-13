// Pure checkers shared by the tests of plugins/with-backup-exclusion.js (T025, RF-088). They read
// text (XML and app.json) and return a list of problems, so a test can assert "no problems" on the
// real output and "this problem" on a deliberately broken input. This file holds no test calls.

/** The nine backup domains of plan.md, "Backup exclusion". */
export const DOMAINS = [
  "root",
  "file",
  "database",
  "sharedpref",
  "external",
  "device_root",
  "device_file",
  "device_database",
  "device_sharedpref",
] as const;

export const PLUGIN_PATH = "plugins/with-backup-exclusion";

const stripComments = (xml: string): string =>
  xml.replace(/<!--[\s\S]*?-->/g, "");

/** The inside of the first `<tag ...>...</tag>`, or null when the element is missing. */
export function sectionOf(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(
    stripComments(xml),
  );
  return match ? (match[1] ?? "") : null;
}

/** How many `<exclude domain="...">` elements `body` holds for `domain`. */
export function excludesOf(body: string, domain: string): number {
  const pattern = /<exclude\s[^>]*?domain="([^"]+)"/g;
  return [...stripComments(body).matchAll(pattern)].filter(
    (match) => match[1] === domain,
  ).length;
}

function sectionProblems(label: string, body: string | null): string[] {
  if (body === null) return [`${label} is missing`];
  return DOMAINS.filter((domain) => excludesOf(body, domain) !== 1).map(
    (domain) => `${label} does not exclude ${domain} exactly once`,
  );
}

/** Problems of a `data_extraction_rules.xml` (Android 12 and later). */
export function extractionRulesProblems(xml: string): string[] {
  return [
    ...(sectionOf(xml, "data-extraction-rules") === null
      ? ["root element data-extraction-rules is missing"]
      : []),
    ...sectionProblems("cloud-backup", sectionOf(xml, "cloud-backup")),
    ...sectionProblems("device-transfer", sectionOf(xml, "device-transfer")),
  ];
}

/** Problems of a `full_backup_content.xml` (Android 11 and lower). */
export function fullBackupProblems(xml: string): string[] {
  return sectionProblems(
    "full-backup-content",
    sectionOf(xml, "full-backup-content"),
  );
}

type PluginEntry = unknown;

function isOurs(entry: PluginEntry): boolean {
  const name: unknown = Array.isArray(entry) ? entry[0] : entry;
  return (
    typeof name === "string" &&
    name.replace(/^\.\//, "").replace(/\.js$/, "") === PLUGIN_PATH
  );
}

/** Problems of the parsed `app.json`: allowBackup, and the plugin listed exactly once. */
export function appJsonProblems(appJson: {
  expo?: { android?: { allowBackup?: unknown }; plugins?: PluginEntry[] };
}): string[] {
  const problems: string[] = [];
  if (appJson.expo?.android?.allowBackup !== false) {
    problems.push("android.allowBackup is not false");
  }
  const listed = (appJson.expo?.plugins ?? []).filter(isOurs).length;
  if (listed !== 1) problems.push(`the plugin is listed ${listed} times`);
  return problems;
}
