/// <reference types="node" />
// Tests of the failure logging of the iOS part of plugins/with-backup-exclusion.js (T026, RF-088,
// E-028; finding SEC-T026-1). A failed exclusion must leave one fixed trace, never data
// (constitution principle 5). The plugin runs on a temporary project, as `expo prebuild` does.
import {
  APP_DELEGATE,
  prebuildIos,
  splitGenerated,
  templateSwift,
} from "./plugin-project-ios";
import { createProject, read, removeProjects } from "./plugin-project";

afterEach(removeProjects);

const LOG_CALL = /\b(NSLog|print|debugPrint|dump|os_log|Logger)\b/;
const FIXED_NSLOG = /^NSLog\(\s*"([^"\\]+)"\s*\)$/;

async function generatedBlock(): Promise<string> {
  const project = createProject({ [APP_DELEGATE]: templateSwift() });
  await prebuildIos(project);
  return splitGenerated(read(project, APP_DELEGATE)).block;
}

// The text between the braces of the first `catch`, found by counting braces.
function catchBody(block: string): string {
  const open = block.indexOf("{", block.indexOf("catch"));
  let depth = 0;
  for (let i = open; i < block.length; i++) {
    if (block[i] === "{") depth++;
    if (block[i] === "}" && --depth === 0) return block.slice(open + 1, i);
  }
  return "";
}

// Swift statements of a body, without comments and blank lines.
const statements = (body: string): string[] =>
  body
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter((line) => line !== "");

const logLines = (block: string): string[] =>
  statements(block).filter((line) => LOG_CALL.test(line));

describe("with-backup-exclusion plugin, iOS failure logging", () => {
  it("RF-088 E-028: the generated block has a catch for a failed exclusion", async () => {
    const block = await generatedBlock();

    expect(block).toMatch(/\bcatch\b/);
  });

  it("RF-088 E-028: the catch is not empty, so a failed exclusion leaves a trace", async () => {
    const block = await generatedBlock();

    expect(statements(catchBody(block))).not.toHaveLength(0);
  });

  it("RF-088 E-028: the catch calls NSLog with one fixed string literal", async () => {
    const block = await generatedBlock();

    const body = statements(catchBody(block));
    expect(body.some((line) => FIXED_NSLOG.test(line))).toBe(true);
  });

  it("RF-088 E-028: every logging call in the block is NSLog with a single plain string literal and no arguments", async () => {
    const block = await generatedBlock();

    const calls = logLines(block);
    expect(calls.length).toBeGreaterThan(0);
    for (const line of calls) {
      expect(line).toMatch(FIXED_NSLOG);
    }
  });

  it("RF-088 E-028: the logged message has no interpolation or format specifier, so no value can reach the log", async () => {
    const block = await generatedBlock();

    const messages = logLines(block).map(
      (line) => line.match(FIXED_NSLOG)?.[1],
    );
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(message).toBeDefined();
      expect(message).not.toContain("\\(");
      expect(message).not.toMatch(/%/);
    }
  });

  it.each([
    ["the error object", /\berror\b/],
    ["the folder url", /databaseFolder|\burl\b/i],
    ["a path", /\bpath\b|\.path|absoluteString|NSHomeDirectory/i],
  ])(
    "RF-088 E-028: no logging call of the block logs %s",
    async (_name, forbidden) => {
      const block = await generatedBlock();

      expect(logLines(block).length).toBeGreaterThan(0);
      for (const line of logLines(block)) {
        expect(line).not.toMatch(forbidden);
      }
    },
  );

  it("RF-088 E-028: the catch does not bind or use the error object, so it cannot be logged or rethrown", async () => {
    const block = await generatedBlock();

    expect(block).not.toMatch(/catch\s+let\b/);
    expect(catchBody(block)).not.toMatch(/\berror\b/);
    expect(block).not.toMatch(/\bthrow\b/);
  });

  it("RF-088 E-028: the catch swallows the failure after logging, so the app still opens", async () => {
    const block = await generatedBlock();

    expect(block).toMatch(/\bdo\s*\{/);
    expect(block).toMatch(/\bcatch\b/);
    expect(block).not.toMatch(/fatalError|preconditionFailure|assert\(|exit\(/);
  });
});
