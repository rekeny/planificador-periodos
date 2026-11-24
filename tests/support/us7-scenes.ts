// The first half of the journey of the US7 flow (T078) as scenes, each a list of steps that must
// appear in order (see us6-flow.ts). A scene starts where the one before it ended. «Alevín A» has
// Juan 7, Ana 3 and Bea 4; «Cadete B» has Juan 7 as well (the same name and number, RF-020) and
// Carla 5. Matches are reached through the lists, never with a deep link.
import es from "@/i18n/es.json";
import {
  BACK,
  OUTSIDE,
  android,
  ios,
  notSee,
  scrollTo,
  see,
  tap,
  tapsOn,
  type,
} from "./us6-flow";
import type { Step } from "./us6-flow";
import {
  TEAM_A,
  TEAM_B,
  TO_TEAMS,
  blank,
  marked,
  tapCell,
  toTeam,
} from "./us6-scenes";
import {
  ERASE,
  EDGE_SWIPE,
  callUpCount,
  deactivateTitle,
  hides,
  hidesNumber,
  shows,
  showsNumber,
  tapsPlayer,
} from "./us7-flow";

export { TEAM_A, TEAM_B, TO_TEAMS, blank, marked, toTeam };

/** Home names that tell the matches apart in the lists, in the order they are created. */
export const HOME = {
  first: "Águilas",
  second: "Halcones",
  third: "Lobos",
  fourth: "Osos",
  other: "Tigres",
} as const;

const addPlayer = (name: string, number: string): Step[] => [
  tap(es.players.new),
  type(name),
  type(number),
  tap(es.common.save),
];

/** A new match of the open team with its home name and the call-up as the form offers it. */
export const newMatch = (home: string, afterCallUp: Step[] = []): Step[] => [
  tap(es.matches.new),
  type(home),
  ...afterCallUp,
  scrollTo(es.common.save),
  tap(es.common.save),
  see(es.callUp.title),
];

/** Two teams with players, the same Juan 7 in both, and a match of «Cadete B». */
export const SETUP: Step[] = [
  tap(es.teams.new),
  type(TEAM_A),
  tap(es.common.save),
  tap(es.teams.new),
  type(TEAM_B),
  tap(es.common.save),
  tap(TEAM_A),
  ...addPlayer("Juan", "7"),
  ...addPlayer("Ana", "3"),
  ...addPlayer("Bea", "4"),
  ...TO_TEAMS,
  tap(TEAM_B),
  ...addPlayer("Juan", "7"),
  ...addPlayer("Carla", "5"),
  ...newMatch(HOME.other),
  ...toTeam(TEAM_B),
  ...TO_TEAMS,
];

/** The saved match of the first team, created before the edit, with a mark of Ana. */
export const FIRST_MATCH: Step[] = [
  tap(TEAM_A),
  ...newMatch(HOME.first),
  showsNumber("Juan", 7),
  tapCell("Ana", "P1"),
  marked("Ana", "P1"),
  ...toTeam(TEAM_A),
  shows(`.*${HOME.first}.*`),
];

/** RF-018: Juan 7 -> 9 in the player screen of «Alevín A»; the team shows 9. */
export const EDIT_JUAN: Step[] = [
  tapsPlayer("Juan"),
  see(es.common.edit),
  see(es.player.field.number),
  tapsOn(es.player.field.number),
  ERASE,
  type("9"),
  tap(es.common.save),
  showsNumber("Juan", 9),
  hidesNumber("Juan", 7),
];

/** RF-020: «Cadete B» still has Juan 7; the change was made in the other team only. */
export const OTHER_TEAM_KEEPS: Step[] = [
  ...TO_TEAMS,
  tap(TEAM_B),
  showsNumber("Juan", 7),
  hidesNumber("Juan", 9),
  ...TO_TEAMS,
];

/** E-018, RF-019: the match created before the edit, opened from the team's list, still shows 7. */
export const OLD_MATCH: Step[] = [
  tap(TEAM_A),
  tapsOn(`.*${HOME.first}.*`),
  marked("Ana", "P1"),
  showsNumber("Juan", 7),
  hidesNumber("Juan", 9),
  ...toTeam(TEAM_A),
];

/** RF-018, E-018: a new match shows 9. */
export const NEW_MATCH_9: Step[] = [
  ...newMatch(HOME.second),
  showsNumber("Juan", 9),
  hidesNumber("Juan", 7),
  ...toTeam(TEAM_A),
  shows(`.*${HOME.second}.*`),
];

const TITLE = deactivateTitle("Ana");
const BUTTON = es.player.deactivate;
const CONFIRM = es.confirm.deactivatePlayer.confirm;

/** RF-022: «Cancelar» keeps Ana active; a tap outside and Android Back leave the question open. */
export const DEACTIVATE: Step[] = [
  tapsPlayer("Ana"),
  see(es.common.edit),
  scrollTo(BUTTON),
  tapsOn(BUTTON),
  see(TITLE),
  see(es.confirm.deactivatePlayer.message),
  see(CONFIRM),
  see(es.common.cancel),
  OUTSIDE,
  see(TITLE),
  android(BACK),
  see(TITLE),
  tap(es.common.cancel),
  notSee(TITLE),
  see(BUTTON),
  notSee(es.player.reactivate),
  tapsOn(BUTTON),
  see(TITLE),
  tapsOn(CONFIRM),
  notSee(TITLE),
  shows(es.player.deactivated),
  shows("Ana"),
];

/** RF-023: a new match has no Ana and does not offer her; the saved match keeps her and her mark. */
export const WITHOUT_ANA: Step[] = [
  ...newMatch(HOME.third, [
    scrollTo(es.callUp.title),
    see(callUpCount(2)),
    hides("Ana"),
  ]),
  blank("Bea", "P1"),
  hides("Ana"),
  tap(es.callUp.title),
  scrollTo(es.callUp.add),
  see(es.callUp.add),
  see(es.callUp.addEmpty),
  hides("Ana"),
  android(BACK),
  ios(EDGE_SWIPE),
  ...toTeam(TEAM_A),
  tapsOn(`.*${HOME.first}.*`),
  marked("Ana", "P1"),
  ...toTeam(TEAM_A),
];
