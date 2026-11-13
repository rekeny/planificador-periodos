// What the US3 planning flow does, step by step (T056), read from the file without running it.
import es from "@/i18n/es.json";
import {
  PLANNING,
  SWIPE_LEFT,
  UNDO,
  UNDO_OFF,
  at,
  cell,
  commands,
  notSee,
  removeOvertimeTitle,
  run,
  see,
  tap,
} from "../support/us3-flow";

const planning = commands(PLANNING);
const starter = (name: string, period = "P1"): string =>
  see(cell(name, period, "starter"));
const empty = (name: string, period = "P1"): string =>
  see(cell(name, period, "empty"));
const tapEmpty = (name: string, period = "P1"): string =>
  tap(cell(name, period, "empty"));

describe("T056 Maestro US3 journeys: marks, Undo and overtimes", () => {
  it("RF-042 RF-055: the grid starts with six periods and no overtime, then five starters are marked in P1 and the sixth tap changes nothing and shows nothing", () => {
    expect(planning).toEqual(expect.arrayContaining([see("P1"), see("P6")]));
    expect(planning).toContain(notSee("PR1"));
    let from = at(planning, see("P6"));
    for (const name of ["Ana", "Bea", "Carla", "Dani", "Eva"]) {
      from = run(planning, [tapEmpty(name), starter(name)], from);
    }
    run(
      planning,
      [
        tapEmpty("Fran"),
        empty("Fran"),
        notSee(cell("Fran", "P1", "starter")),
        notSee(cell("Fran", "P1", "sub")),
      ],
      from,
    );
  });

  it("RF-055: a tap on an X of a period with no sub removes it", () => {
    run(planning, [tap(cell("Eva", "P1", "starter")), empty("Eva")]);
  });

  it("RF-057: Undo is pressed seven times for six actions, each press reverts one, and the extra press changes nothing", () => {
    const steps = [UNDO, starter("Eva")];
    const pairs: readonly (readonly [string, string])[] = [
      ["Eva", "Dani"],
      ["Dani", "Carla"],
      ["Carla", "Bea"],
      ["Bea", "Ana"],
    ];
    for (const [now, before] of pairs) {
      steps.push(UNDO, empty(now), starter(before));
    }
    steps.push(UNDO, empty("Ana"), UNDO, UNDO_OFF, empty("Ana"), empty("Bea"));
    run(planning, steps);
  });

  it("RF-058 RF-057: with a mark and an overtime, two presses of Undo remove the mark and keep the overtime", () => {
    run(planning, [
      tapEmpty("Bea"),
      starter("Bea"),
      tap(es.grid.addOvertime),
      see("PR1"),
      see(es.grid.removeOvertime),
      UNDO,
      UNDO,
      empty("Bea"),
      see("PR1"),
      UNDO_OFF,
    ]);
  });

  it("RF-059: an overtime with no marks goes at once with no question and takes its button with it", () => {
    run(planning, [
      tap(es.grid.removeOvertime),
      notSee(removeOvertimeTitle(1)),
      notSee("PR1"),
      notSee(es.grid.removeOvertime),
    ]);
  });

  it("RF-058 RF-059: three overtimes make the grid scroll sideways and only the last one is removed each time", () => {
    const add = tap(es.grid.addOvertime);
    run(planning, [add, add, add, SWIPE_LEFT, see("PR3")]);
    run(planning, [
      tap(es.grid.removeOvertime),
      notSee("PR3"),
      tap(es.grid.removeOvertime),
      notSee("PR2"),
      notSee(removeOvertimeTitle(2)),
      see("PR1"),
    ]);
  });
});
