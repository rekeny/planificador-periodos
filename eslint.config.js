// https://docs.expo.dev/guides/using-eslint/
// Order: Expo base, project rules, test exceptions, Prettier last (docs/architecture.md, "Convenciones").
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const boundaries = require("eslint-plugin-boundaries");
const i18next = require("eslint-plugin-i18next");
const prettier = require("eslint-config-prettier/flat");

const TEST_FILES = ["**/*.test.ts", "**/*.test.tsx", "tests/**"];
const LAYERS = ["app", "ui", "state", "data", "domain", "i18n"];
const ANY_PACKAGE = { module: { origin: ["external", "core"] } };

// One layer may import another only as the table "Capas" of docs/architecture.md says.
// `types` means type-only imports (`import type`).
const layerPolicy = (from, values, types = []) => ({
  from: { element: { type: from } },
  allow: [
    ...(values.length > 0 ? [{ to: { element: { type: values } } }] : []),
    ...(types.length > 0
      ? [{ to: { element: { type: types } }, dependency: { kind: "type" } }]
      : []),
  ],
});

const boundaryRules = [
  layerPolicy("app", ["ui", "state", "i18n"], ["domain"]),
  layerPolicy("ui", ["state", "i18n"], ["domain"]),
  layerPolicy("state", ["domain", "data"]),
  layerPolicy("data", [], ["domain"]),
  // Packages: everything is allowed first, then each layer loses what it must not import.
  { from: { element: { type: LAYERS } }, allow: { to: ANY_PACKAGE } },
  { from: { element: { type: "domain" } }, disallow: { to: ANY_PACKAGE } },
  {
    from: { element: { type: ["app", "ui", "i18n"] } },
    disallow: {
      to: {
        module: { origin: "external", source: ["expo-sqlite", "drizzle-orm"] },
      },
    },
  },
  {
    from: { element: { type: "state" } },
    disallow: {
      to: { module: { origin: "external", source: "react-native" } },
    },
  },
  // Tests may import anything they test.
  {
    from: { file: { categories: "test" } },
    allow: { to: { element: { type: LAYERS } } },
  },
  { from: { file: { categories: "test" } }, allow: { to: ANY_PACKAGE } },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "ios/",
      "android/",
      "coverage/",
      "reports/",
      ".stryker-tmp/",
      ".expo/",
    ],
  },
  {
    // No comment can switch a rule off.
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": LAYERS.map((type) => ({
        type,
        pattern: `src/${type}`,
      })),
      "boundaries/files": [{ pattern: TEST_FILES, category: "test" }],
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        { default: "disallow", checkAllOrigins: true, policies: boundaryRules },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": true,
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": true,
        },
      ],
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        ...["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map(
          (name) => ({
            name,
            message:
              "The app makes no network calls (docs/constitution.md, principle 3).",
          }),
        ),
      ],
      complexity: ["error", 10],
      "max-lines": [
        "error",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["error", 4],
      "max-depth": ["error", 3],
      "import/no-default-export": "error",
    },
  },
  {
    // Expo Router requires default exports in routes.
    files: ["src/app/**/*.{ts,tsx}"],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["src/app/**/*.tsx", "src/ui/**/*.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": ["error", { mode: "jsx-text-only" }],
    },
  },
  {
    // `i18n.use(...)` is the documented way to plug react-i18next in; the rule only guesses a typo.
    files: ["src/i18n/index.ts"],
    rules: { "import/no-named-as-default-member": "off" },
  },
  {
    // CommonJS config file: Node provides __dirname.
    files: ["jest.config.js"],
    languageOptions: { globals: { __dirname: "readonly" } },
  },
  {
    files: TEST_FILES,
    rules: {
      "max-lines-per-function": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  prettier,
]);
