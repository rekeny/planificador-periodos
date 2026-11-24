// What the US5 subs flow does about the questions, step by step (T066), read from the file without
// running it. The long-press menu, the legend, E-026 and the saved state are in `us5-menu.test.ts`.
import es from "@/i18n/es.json";
import {
  ANYWAY,
  ASKS,
  CANCEL,
  CHOICE,
  QUESTION,
  REMINDER,
  cell,
  empty,
  expectClosings,
  fill,
  header,
  notSee,
  pick,
  run,
  see,
  sub,
  subs,
  starter,
  tap,
  tapEmpty,
} from "../support/us5-flow";

describe("T066 Maestro US5 journeys: the questions of the subs flow", () => {
  it("RF-045 RF-055 E-011: the sixth tap in P2 asks, and «Cancelar», a tap outside and Back each close the question and change nothing", () => {
    run(subs, fill("P2", ["Bea", "Carla", "Dani", "Eva"]));
    expectClosings(subs, [tapEmpty("Fran", "P2")], ASKS, [
      empty("Fran", "P2"),
      starter("Eva", "P2"),
      notSee(cell("Fran", "P2", "sub")),
    ]);
  });

  it("RF-046: answering «Entra de cambio» marks a circled X and the five X of P2 stay", () => {
    run(subs, [
      tapEmpty("Fran", "P2"),
      see(QUESTION),
      tap(es.grid.subOrStarter.sub),
      notSee(QUESTION),
      sub("Fran", "P2"),
      starter("Eva", "P2"),
      starter("Ana", "P2"),
    ]);
  });

  it("RF-045 RF-047: the choice of the replaced X closes with «Cancelar», a tap outside and Back changing nothing, and choosing Eva moves her X to Gala and leaves her cell empty, not circled", () => {
    const open = [
      tapEmpty("Gala", "P2"),
      see(QUESTION),
      tap(es.grid.subOrStarter.starter),
    ];
    expectClosings(
      subs,
      open,
      [CHOICE, CANCEL],
      [
        notSee(QUESTION),
        empty("Gala", "P2"),
        starter("Eva", "P2"),
        sub("Fran", "P2"),
      ],
    );
    run(subs, [
      ...open,
      see(CHOICE),
      pick("Eva"),
      notSee(CHOICE),
      starter("Gala", "P2"),
      empty("Eva", "P2"),
      notSee(cell("Eva", "P2", "sub")),
      sub("Fran", "P2"),
    ]);
  });

  it("RF-006 RF-048 RF-051 E-012: in P6, a free period with 5 X, a tap on an empty cell marks a circled X with no question, and a tap on the circled X empties it", () => {
    const five = fill("P6", ["Ana", "Bea", "Carla", "Dani", "Eva"]);
    run(subs, [
      ...five,
      tapEmpty("Fran", "P6"),
      sub("Fran", "P6"),
      notSee(QUESTION),
      tap(cell("Fran", "P6", "sub")),
      empty("Fran", "P6"),
    ]);
  });

  it("RF-050 RF-054 RF-066 E-013: in P3, with 5 X and a sub, the reminder closes three ways keeping the X, and «Quitar de todos modos» leaves the sub, a «≠» and no «!»", () => {
    run(subs, fill("P3", ["Bea", "Carla", "Dani", "Eva", "Fran"]));
    const open = [tap(cell("Eva", "P3", "starter"))];
    expectClosings(
      subs,
      open,
      [REMINDER, ANYWAY, CANCEL],
      [starter("Eva", "P3"), sub("Ana", "P3")],
    );
    run(subs, [
      ...open,
      see(REMINDER),
      tap(ANYWAY),
      notSee(REMINDER),
      empty("Eva", "P3"),
      sub("Ana", "P3"),
      header("≠", "P3", "P4"),
      `- assertNotVisible:; text: "!"; rightOf: "P3"; leftOf: "P4"`,
    ]);
  });
});
