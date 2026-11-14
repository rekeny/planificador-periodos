// Dynamic config (https://docs.expo.dev/workflow/configuration/): Expo reads app.json and hands it
// to this function as `config`. It returns it whole, except that the production build also blocks
// the Android INTERNET permission (RF-011, constitution principle 3, SEC-D2-1). The debug build and
// the dev client keep it because they reach Metro through it.
// `APP_VARIANT` is the variable of Expo's "multiple app variants" guide. EAS is not set up yet, so
// there is no eas.json: the release preparation creates it with
// `build.production.env.APP_VARIANT = "production"` (docs/security.md, "Before each release").
// A local production build sets it by hand: `APP_VARIANT=production npx expo prebuild --platform
// android --clean`.
const INTERNET = "android.permission.INTERNET";

module.exports = ({ config }) => {
  // Read at every call, never at import, so each evaluation sees the current environment.
  if (process.env.APP_VARIANT !== "production") return config;
  const blocked = config.android?.blockedPermissions ?? [];
  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: blocked.includes(INTERNET)
        ? blocked
        : [...blocked, INTERNET],
    },
  };
};
