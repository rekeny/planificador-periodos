// What the US6 flow does with a saved match (T073), read from the file without running it: edit the
// details, change the format and delete the match. Each test checks the journey from its start up
// to its own scene, in order, on iOS and on Android (see `us6-journeys.test.ts` for the first half).
import { expectJourney } from "../support/us6-journey";

describe("T073 Maestro US6 journeys: editing, changing the format and deleting", () => {
  it("RF-028 RF-083 E-032: «Editar» opens the details, home, away and score are typed, «Quitar hora» leaves «Sin hora» and «Añadir hora» and no time before «Guardar», and the lists show the new data with no time", () => {
    expectJourney("edit");
  });

  it("RF-039 RF-082 E-016: changing 8 to 4 asks «¿Cambiar la variante?» with its message, «Cambiar variante» and «Cancelar»; a tap outside at 2%,50% and Android Back leave it open and «Cancelar» keeps the other typed detail; once confirmed, the details are left with no «Guardar», the grid has 4 periods and the list shows 4 periodos and the old home name", () => {
    expectJourney("to4");
  });

  it("RF-039 RF-040 E-016: choosing the format the match already has asks nothing, 4 to 8 asks again even with no mark to lose, and afterwards Ana's P5 cell is empty (the mark was deleted) and her P1 mark stays", () => {
    expectJourney("to8");
  });

  it("RF-029 RF-074 RF-075: «Borrar partido» is reached by scrolling in the details of a match opened from «Todos los partidos»; «¿Borrar este partido?» stays open with a tap outside and Android Back and closes with «Cancelar»; once confirmed, the list of every match no longer shows it and the list of its team reads «Todavía no hay partidos.»", () => {
    expectJourney("remove");
  });
});
