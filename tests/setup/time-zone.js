// Jest `globalSetup`: every test runs in the time zone of Spain, whatever the zone of the machine or
// of the CI runner. It runs in the main process before the workers start, so they inherit the zone;
// assigning `process.env.TZ` inside a test does not change the zone that `Date` uses there. The
// date and time pieces of the new-match form depend on it (F-02, 29 March 2026 is the day the clocks
// go forward in Spain), and the other zones are checked in child processes
// (src/ui/date-time-field.zones.test.ts).
module.exports = async () => {
  process.env.TZ = "Europe/Madrid";
};
