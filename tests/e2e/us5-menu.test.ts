// What the US5 flows do with the long-press menu, the legend and the call-up screen, step by step
// (T066), read from the files without running them.
import es from "@/i18n/es.json";
import {
  ANYWAY,
  CANCEL,
  CHOICE,
  MENU,
  MENU_SHOWN,
  QUESTION,
  REMINDER,
  UNDO,
  at,
  cell,
  empty,
  expectClosings,
  fill,
  header,
  link,
  notSee,
  pick,
  press,
  removeFromCallUpTitle,
  run,
  scrollTo,
  see,
  starter,
  sub,
  subs,
  tap,
  tapEmpty,
  undo,
} from "../support/us5-flow";

describe("T066 Maestro US5 journeys: the long-press menu, E-027, E-026 and the saved state", () => {
  it("RF-052 RF-053: a long press on a circled X offers the three options and «Cancelar», and «Titular» in a period with 5 X asks which X it replaces", () => {
    run(subs, [
      press("Fran", "P2", "sub"),
      ...MENU_SHOWN.map(see),
      tap(MENU.starter),
      see(CHOICE),
      pick("Dani"),
      notSee(CHOICE),
      starter("Fran", "P2"),
      empty("Dani", "P2"),
      notSee(cell("Dani", "P2", "sub")),
    ]);
  });

  it("RF-050 RF-052 RF-054: the long-press menu closes three ways changing nothing, «Quitar» on an X in a period with a sub shows the reminder first, and without a sub it removes at once", () => {
    const open = [press("Dani", "P3", "starter")];
    expectClosings(subs, open, MENU_SHOWN, [starter("Dani", "P3")]);
    run(subs, [
      ...open,
      tap(MENU.remove),
      see(REMINDER),
      tap(CANCEL),
      notSee(REMINDER),
      starter("Dani", "P3"),
    ]);
    run(subs, [
      ...open,
      tap(MENU.remove),
      see(REMINDER),
      tap(ANYWAY),
      notSee(REMINDER),
      empty("Dani", "P3"),
    ]);
    run(subs, [
      press("Ana", "P3", "sub"),
      tap(MENU.starter),
      notSee(CHOICE),
      starter("Ana", "P3"),
    ]);
    run(subs, [
      press("Fran", "P3", "starter"),
      tap(MENU.remove),
      notSee(REMINDER),
      empty("Fran", "P3"),
    ]);
    run(subs, [
      press("Bea", "P3", "starter"),
      tap(MENU.sub),
      sub("Bea", "P3"),
      press("Bea", "P3", "sub"),
      tap(MENU.remove),
      empty("Bea", "P3"),
    ]);
  });

  it("RF-052 RF-066 RF-087 E-027: the situation of E-002 is built with the menu, and the legend, found by scrolling, explains the light red cell, «!» and «≠» and not the player in red", () => {
    run(subs, [
      ...fill("P1", ["Ana"]),
      ...fill("P2", ["Ana"]),
      ...fill("P3", ["Ana"]),
      press("Ana", "P3", "starter"),
      ...MENU_SHOWN.map(see),
      tap(MENU.sub),
      notSee(MENU.sub),
      sub("Ana", "P3"),
    ]);
    for (const text of [
      es.warning.lightRedCell,
      es.warning.incompletePeriod,
      es.warning.inconsistentPeriod,
    ]) {
      run(subs, [scrollTo(text), see(text)]);
    }
    run(subs, [
      notSee(es.warning.playerInRed),
      notSee(es.warning.ruleImpossible),
      header("≠", "P3", "P4"),
      `- assertVisible:; text: "!"; leftOf: "P2"`,
      header("!", "P5", "P6"),
    ]);
    expect(at(subs, scrollTo(es.warning.lightRedCell))).toBeGreaterThan(
      at(subs, sub("Ana", "P3")),
    );
  });

  it("RF-082 E-019: the marks of the subs flow are still there when the app is closed and the match is opened again", () => {
    const stop = at(subs, "- stopApp");
    expect(at(subs, link("matches/1"), stop)).toBeGreaterThan(stop);
    expect(subs.slice(at(subs, link("matches/1"), stop))).toEqual([
      link("matches/1"),
      '- extendedWaitUntil:; visible: "Ana, P3: X, titular"; timeout: 20000',
      starter("Ana", "P3"),
      starter("Carla", "P3"),
      empty("Bea", "P3"),
      starter("Gala", "P2"),
      starter("Fran", "P2"),
      empty("Eva", "P2"),
      empty("Dani", "P2"),
    ]);
  });

  it("RF-045 RF-047 RF-057 RF-086 E-026: Ana replaces Eva as a starter in P2, Eva is removed in the call-up screen, and Undo on the grid empties Ana's P2 and does not bring Eva back", () => {
    run(undo, fill("P2", ["Bea", "Carla", "Dani", "Eva", "Fran"]));
    const replace = run(undo, [
      tapEmpty("Ana", "P2"),
      see(QUESTION),
      tap(es.grid.subOrStarter.starter),
      see(CHOICE),
      pick("Eva"),
      notSee(CHOICE),
      starter("Ana", "P2"),
      empty("Eva", "P2"),
    ]);
    const removal = run(undo, [
      tap("Convocatoria"),
      see(es.callUp.add),
      '- tapOn:; text: "Quitar de la convocatoria"; index: 4',
      notSee(removeFromCallUpTitle("Eva")),
      scrollTo(".*Eva.*"),
      `- assertVisible:; text: ".*Eva.*"; below: "${es.callUp.add}"`,
      "- runFlow:; when:; platform: Android; commands:",
      "- back",
      "- runFlow:; when:; platform: iOS; commands:",
      "- swipe:; start: 2%, 50%; end: 70%, 50%",
      starter("Ana", "P2"),
    ]);
    expect(removal).toBeGreaterThan(replace);
    run(undo, [
      notSee(cell("Eva", "P2", "empty")),
      notSee(cell("Eva", "P2", "starter")),
      UNDO,
      empty("Ana", "P2"),
      starter("Bea", "P2"),
      starter("Carla", "P2"),
      starter("Dani", "P2"),
      starter("Fran", "P2"),
      notSee(cell("Eva", "P2", "starter")),
      notSee(cell("Eva", "P2", "empty")),
    ]);
  });

  it("RF-082 E-019 E-026: after closing the app and opening the match again, Ana's P2 is still empty, the four X are there and Eva is not", () => {
    const stop = at(undo, "- stopApp");
    expect(undo.slice(at(undo, link("matches/1"), stop))).toEqual([
      link("matches/1"),
      '- extendedWaitUntil:; visible: "Bea, P2: X, titular"; timeout: 20000',
      empty("Ana", "P2"),
      starter("Fran", "P2"),
      notSee(cell("Eva", "P2", "empty")),
      notSee(cell("Eva", "P2", "starter")),
    ]);
  });
});
