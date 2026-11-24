// What the US6 flow does step by step until the saved match is edited (T073), read from the file
// without running it: the creation with the pickers, the marks and «Deshacer», the lists and E-019.
// The details, the format change and the deletion are in `us6-edits.test.ts`. Each test checks the
// journey from its start up to its own scene, in order, on iOS and on Android: a scene starts where
// the one before it ended, and steps of one platform only count in that platform's run.
import { expectJourney } from "../support/us6-journey";

describe("T073 Maestro US6 journeys: creating, marking and listing", () => {
  it("RF-082: the flow starts with two teams, «Alevín A» with Ana, Bea and Carla and «Cadete B» with no players", () => {
    expectJourney("setup");
  });

  it("RF-083 E-032: a match of 8 periods is created with the real date picker (1 March 2026) and «Añadir hora», with «Sin hora» and «Añadir hora» checked first, 12:00 checked on iOS and 18:30 set in the Android dialog, before «Guardar» opens the grid", () => {
    expectJourney("create");
  });

  it("RF-028 RF-057: marks of Ana in P1 and P5 and of Bea in P2, then «Editar» and back to the grid keep the three marks and one «Deshacer» removes only the last one", () => {
    expectJourney("marks");
  });

  it("RF-028 RF-082: creating a match and pressing Back from its grid lists it exactly once and does not show the form again (review P-30)", () => {
    expectJourney("once");
  });

  it("RF-074 RF-075: a second team gets its own match, with today's date and no time", () => {
    expectJourney("second");
  });

  it("RF-074 RF-075 RF-083 E-032: «Todos los partidos» shows the match of today above the one of 1 March, with the team names, the formats and the time of the picker (12:00 on iOS, 18:30 on Android), and the list of «Alevín A» shows only its own match", () => {
    expectJourney("lists");
  });

  it("RF-057 RF-082 E-019: after the app is closed and opened again the match is reached through the list of teams and the team, with the same marks and «Deshacer» disabled", () => {
    expectJourney("reopen");
  });
});
