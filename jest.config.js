// Jest configuration. The 90 % coverage threshold of src/domain applies once domain code exists,
// because Jest fails when a threshold path has no files.
const fs = require("node:fs");
const path = require("node:path");

const domainDir = path.join(__dirname, "src", "domain");
const isSourceFile = (file) =>
  /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file);
const hasDomainCode =
  fs.existsSync(domainDir) &&
  fs
    .readdirSync(domainDir, { recursive: true })
    .some((file) => isSourceFile(String(file)));

const domainThreshold = {
  branches: 90,
  functions: 90,
  lines: 90,
  statements: 90,
};

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/tests/setup/fast-check.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/.stryker-tmp/",
    "<rootDir>/e2e/",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!tests/**",
    "!src/**/*.d.ts",
  ],
  coverageReporters: ["text-summary", "lcov"],
  ...(hasDomainCode && {
    coverageThreshold: { "./src/domain/": domainThreshold },
  }),
};
