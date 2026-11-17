// What the US3 flows do around confirmations, reopening and interruptions (T056), read from the files
// without running them.
import es from "@/i18n/es.json";
import {
  INTERRUPTION,
  OUTSIDE_AND_BACK,
  PLANNING,
  SWIPE_LEFT,
  UNDO,
  UNDO_OFF,
  at,
  cell,
  commands,
  link,
  notSee,
  removeFromCallUpTitle,
  removeOvertimeTitle,
  run,
  see,
  tap,
} from "../support/us3-flow";

const planning = commands(PLANNING);
const interruption = commands(INTERRUPTION);
const starter = (name: string, period = "P1"): string =>
  see(cell(name, period, "starter"));
const empty = (name: string, period = "P1"): string =>
  see(cell(name, period, "empty"));
const confirm = (title: string, label: string): string =>
  `- tapOn:; text: "${label}"; below: "${title}"`;
const listed = (name: string, where: "above" | "below"): string =>
  `- assertVisible:; text: "${name}"; ${where}: "${es.callUp.add}"`;

describe("T056 Maestro US3 journeys: confirmations and reopening", () => {
  it("RF-059: an overtime with marks asks first, outside and Back do nothing, Cancel keeps it and its marks, confirming deletes both", () => {
    const title = removeOvertimeTitle(1);
    const ask = [
      tap(cell("Ana", "PR1", "empty")),
      starter("Ana", "PR1"),
      tap(es.grid.removeOvertime),
      see(title),
      see(es.confirm.removeOvertime.message),
      ...OUTSIDE_AND_BACK,
      see(title),
      tap(es.common.cancel),
      notSee(title),
      see("PR1"),
      starter("Ana", "PR1"),
      tap(es.grid.removeOvertime),
      see(title),
      confirm(title, es.confirm.removeOvertime.confirm),
      notSee("PR1"),
      notSee(cell("Ana", "PR1", "starter")),
      notSee(es.grid.removeOvertime),
    ];
    run(planning, ask);
  });

  it("RF-034 E-017: removing Ana, who has marks, asks first, outside and Back do nothing and Cancel keeps Ana and her marks", () => {
    const title = removeFromCallUpTitle("Ana");
    const first = run(planning, [
      tap(es.callUp.remove),
      see(title),
      see(es.confirm.removeFromCallUp.message),
      ...OUTSIDE_AND_BACK,
      see(title),
      tap(es.common.cancel),
      notSee(title),
      listed("Ana", "above"),
    ]);
    for (const period of ["P1", "P2", "P3"]) {
      expect(at(planning, starter("Ana", period), first)).toBeGreaterThan(
        first,
      );
    }
  });

  it("RF-034 E-017: on confirming, only Ana's row and marks are deleted, Bea's mark stays and Undo cannot bring Ana back", () => {
    const title = removeFromCallUpTitle("Ana");
    const sure = run(planning, [
      tap(es.callUp.remove),
      see(title),
      confirm(title, es.confirm.removeFromCallUp.confirm),
      notSee(title),
      listed("Ana", "below"),
    ]);
    run(
      planning,
      [
        notSee(cell("Ana", "P1", "starter")),
        notSee(cell("Ana", "P1", "empty")),
        starter("Bea", "P2"),
        UNDO,
        empty("Bea", "P2"),
        UNDO_OFF,
        notSee(cell("Ana", "P1", "empty")),
      ],
      sure,
    );
  });

  it("RF-057: after the call-up screen is opened and closed, Undo still removes the last mark (criterion 7)", () => {
    const open = run(planning, [tap(es.callUp.title), see(es.callUp.add)]);
    run(planning, [UNDO, empty("Bea"), starter("Ana", "P3")], open);
  });

  it("RF-057: after going back to the team and opening the match with its deep link, the mark is saved and Undo has nothing to undo", () => {
    const open = at(planning, link("matches/1"));
    expect(planning[open - 1]).toBe(see(es.matches.new));
    run(planning, [starter("Bea"), UNDO_OFF, UNDO, starter("Bea")], open);
  });
});

describe("T056 Maestro US3 interruptions", () => {
  it("RF-057 RF-082 E-019: with marks in P1, P2, P3 and an overtime the app is closed, the list of teams comes first, then the match has all of them and Undo is empty", () => {
    const marks = [
      ["Ana", "P1"],
      ["Bea", "P1"],
      ["Ana", "P2"],
      ["Bea", "P3"],
      ["Ana", "PR1"],
    ] as const;
    const stop = at(interruption, "- stopApp");
    for (const [name, period] of marks) {
      expect(at(interruption, starter(name, period))).toBeLessThan(stop);
    }
    run(
      interruption,
      ["- stopApp", "- launchApp", see(es.teams.new), see("Alevín A")],
      stop,
    );
    const open = at(interruption, link("matches/1"), stop);
    for (const [name, period] of marks) {
      expect(at(interruption, starter(name, period), open)).toBeGreaterThan(
        open,
      );
    }
    expect(interruption).toContain(SWIPE_LEFT);
    run(interruption, [UNDO_OFF, UNDO, starter("Ana", "PR1")], open);
  });

  it("RF-082: a player without marks is removed in the call-up with no question, the app is closed and the call-up is as it was left", () => {
    const remove = `- tapOn:; text: "${es.callUp.remove}"; index: 2`;
    const stop = run(interruption, [
      remove,
      notSee(removeFromCallUpTitle("Carla")),
      listed("Carla", "below"),
    ]);
    const open = run(interruption, ["- stopApp", "- launchApp"], stop);
    run(
      interruption,
      [
        link("matches/1"),
        tap(es.callUp.title),
        listed("Carla", "below"),
        listed("Ana", "above"),
        listed("Bea", "above"),
      ],
      open,
    );
  });

  it("RF-082: the links to match 99, abc and 01 each start from a fresh launch and show the not-found message, and nothing of match 1 is shown", () => {
    for (const path of ["matches/99", "matches/abc", "matches/01"]) {
      run(interruption, [
        "- stopApp",
        "- launchApp",
        link(path),
        see(es.notFound.message),
      ]);
    }
    expect(interruption.at(-1)).toBe(notSee(cell("Ana", "P1", "starter")));
  });
});
