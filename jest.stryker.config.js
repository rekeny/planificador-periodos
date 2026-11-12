// Jest configuration used only by Stryker (stryker.config.json, `jest.configFile`).
// It runs only the domain tests, leaves out the timing-based budget tests and uses 100 fast-check runs.
const base = require("./jest.config.js");

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  setupFiles: ["<rootDir>/tests/setup/fast-check-mutation.ts"],
  testMatch: ["<rootDir>/src/domain/**/*.test.ts"],
  testPathIgnorePatterns: [
    ...base.testPathIgnorePatterns,
    "\\.budget\\.test\\.ts$",
  ],
};
