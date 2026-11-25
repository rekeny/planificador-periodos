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
  // 5 s is Jest's default. The screen tests render whole route trees and the grid property test runs
  // many cases: on a loaded machine or the two-core CI runner a few of them passed 5 s (CI of
  // PR 25, and two local runs), and the failure was the timeout, not the behaviour.
  testTimeout: 30000,
  globalSetup: "<rootDir>/tests/setup/time-zone.js",
  setupFiles: ["<rootDir>/tests/setup/fast-check.ts"],
  // After the test framework is installed, because the testing library of expo-router needs `expect`.
  setupFilesAfterEnv: ["<rootDir>/tests/setup/gesture-handler.ts"],
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
