// What the US7 flow does step by step (T078), read from the file without running it. Each test checks
// the journey from its start up to its own scene, in order, on iOS and on Android: a scene starts where
// the one before it ended, and steps of one platform only count in that platform's run. The generic
// rules of the flow are in `us7-flow.test.ts` and `us7-keyboard.test.ts`.
import { expectJourney } from "../support/us7-journey";

describe("T078 Maestro US7 journeys: the squad is kept up to date", () => {
  it("RF-020: the flow starts with two teams that both have a Juan 7, «Alevín A» with Ana 3 and Bea 4 and «Cadete B» with Carla 5 and a match", () => {
    expectJourney("setup");
  });

  it("RF-019 E-018: a match of «Alevín A» is created, with Juan 7 and a mark of Ana in P1, before the number is edited", () => {
    expectJourney("first");
  });

  it("RF-018: Juan's number is changed from 7 to 9 in the player screen, by erasing the field, and the team shows 9 and no 7", () => {
    expectJourney("edit");
  });

  it("RF-020: «Cadete B» still shows its own Juan with 7 and no 9 after the edit in «Alevín A»", () => {
    expectJourney("otherTeam");
  });

  it("RF-019 E-018: the match created before the edit, opened from the team's list, still shows Juan with 7 and Ana's mark", () => {
    expectJourney("old");
  });

  it("RF-018 RF-019 E-018: a new match created after the edit shows Juan with 9 and no 7", () => {
    expectJourney("new9");
  });

  it("RF-022: «Desactivar» is reached by scrolling and asks «¿Desactivar a Ana?»; a tap outside at 2%,50% and Android Back leave it open, «Cancelar» keeps Ana active, and confirming leaves «Desactivado» in the team", () => {
    expectJourney("deactivate");
  });

  it("RF-023: a new match has no Ana (2 convocados), «Añadir a la convocatoria» does not offer her, and the saved match still shows her and her mark", () => {
    expectJourney("withoutAna");
  });

  it("RF-024: «Reactivar» asks nothing, «Desactivado» is gone and the next new match has Ana again (3 convocados)", () => {
    expectJourney("reactivate");
  });

  it("RF-015: «Borrar equipo» is reached by scrolling in the edit-team form and asks with the counts (sus 2 jugadores y su partido); a tap outside at 2%,50% and Android Back leave it open, «Cancelar» keeps the team, and confirming leaves the list of teams without it", () => {
    expectJourney("deleteTeam");
  });

  it("RF-015: after the team is deleted, «Todos los partidos» shows the matches of the other team and none of the deleted one", () => {
    expectJourney("afterDelete");
  });
});
