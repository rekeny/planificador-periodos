/// <reference types="node" />
// Tests of the versioned configuration of the backup exclusion (T025, RF-088, E-028; E-028 itself
// is the device check): app.json, and the checkers that decide when an XML or app.json is wrong.
// Valid and broken XML are built at run time; app.json is the real file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DOMAINS,
  appJsonProblems,
  extractionRulesProblems,
  fullBackupProblems,
} from "./backup-checks";
import { ROOT } from "./plugin-project";

const readAppJson = () =>
  JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8"));
const PLUGIN = "./plugins/with-backup-exclusion.js";
const excludes = (domains: readonly string[]): string =>
  domains.map((domain) => `<exclude domain="${domain}" path="."/>`).join("");
const validRules = (domains: readonly string[] = DOMAINS): string =>
  "<data-extraction-rules>" +
  `<cloud-backup>${excludes(domains)}</cloud-backup>` +
  `<device-transfer>${excludes(domains)}</device-transfer>` +
  "</data-extraction-rules>";
const validFull = (domains: readonly string[] = DOMAINS): string =>
  `<full-backup-content>${excludes(domains)}</full-backup-content>`;
const without = (domain: string): string[] =>
  DOMAINS.filter((d) => d !== domain);

describe("backup exclusion, versioned configuration", () => {
  describe("happy path", () => {
    it("RF-088 E-028: app.json keeps android.allowBackup false and lists the plugin exactly once", () => {
      expect(appJsonProblems(readAppJson())).toEqual([]);
    });
  });

  describe("mistakes", () => {
    it.each([
      [
        "allowBackup set to true",
        { android: { allowBackup: true }, plugins: [PLUGIN] },
      ],
      ["allowBackup removed", { android: {}, plugins: [PLUGIN] }],
      [
        "the plugin removed from plugins",
        { android: { allowBackup: false }, plugins: [] },
      ],
      [
        "the plugin listed twice",
        { android: { allowBackup: false }, plugins: [PLUGIN, [PLUGIN, {}]] },
      ],
    ])("RF-088 E-028: app.json with %s fails the check", (_name, expo) => {
      expect(appJsonProblems({ expo })).not.toEqual([]);
    });

    it("RF-088 E-028: the checkers accept an XML that excludes every domain", () => {
      expect(extractionRulesProblems(validRules())).toEqual([]);
      expect(fullBackupProblems(validFull())).toEqual([]);
    });

    it("RF-088 E-028: an XML without the device-transfer section fails the check", () => {
      const xml = validRules().replace(
        /<device-transfer>[\s\S]*<\/device-transfer>/,
        "",
      );

      expect(extractionRulesProblems(xml)).not.toEqual([]);
    });

    it.each(DOMAINS)(
      "RF-088 E-028: an XML missing the domain %s fails the check, in the extraction rules and in the full backup content",
      (domain) => {
        expect(
          extractionRulesProblems(validRules(without(domain))),
        ).not.toEqual([]);
        expect(fullBackupProblems(validFull(without(domain)))).not.toEqual([]);
      },
    );

    it("RF-088 E-028: an exclusion that is only an XML comment does not count", () => {
      const xml = `<full-backup-content>${DOMAINS.map(
        (domain) => `<!-- <exclude domain="${domain}" path="."/> -->`,
      ).join("")}</full-backup-content>`;

      expect(fullBackupProblems(xml)).toHaveLength(DOMAINS.length);
    });
  });
});
