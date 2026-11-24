// The second half of the journey of the US7 flow (T078): Ana is reactivated and a team is deleted.
// Same rules as us7-scenes.ts.
import es from "@/i18n/es.json";
import {
  BACK,
  OUTSIDE,
  android,
  notSee,
  scrollTo,
  see,
  tap,
  tapsOn,
} from "./us6-flow";
import type { Step } from "./us6-flow";
import {
  HOME,
  TEAM_A,
  TEAM_B,
  TO_TEAMS,
  blank,
  newMatch,
  toTeam,
} from "./us7-scenes";
import {
  callUpCount,
  deactivateTitle,
  deleteTeamMessage,
  deleteTeamTitle,
  hides,
  shows,
  tapsPlayer,
} from "./us7-flow";

/** RF-024: «Reactivar» asks nothing; Ana is no longer «Desactivado» and is in the next new match. */
export const REACTIVATE: Step[] = [
  tapsPlayer("Ana"),
  see(es.common.edit),
  see(es.player.reactivate),
  notSee(es.player.deactivate),
  tapsOn(es.player.reactivate),
  { never: tap(es.confirm.deactivatePlayer.confirm) },
  notSee(deactivateTitle("Ana")),
  hides(es.player.deactivated),
  shows("Ana"),
  ...newMatch(HOME.fourth, [
    scrollTo(es.callUp.title),
    see(callUpCount(3)),
    shows("Ana"),
  ]),
  blank("Ana", "P1"),
  ...toTeam(TEAM_A),
  shows(`.*${HOME.fourth}.*`),
];

const TITLE = deleteTeamTitle(TEAM_B);
const DELETE = es.team.delete;
const CONFIRM = es.confirm.deleteTeam.confirm;

/** RF-015: «Cadete B» has 2 players and 1 match; the question closes only with its buttons. */
export const DELETE_TEAM: Step[] = [
  ...TO_TEAMS,
  tap(es.matches.allTitle),
  shows(`.*${HOME.other}.*`),
  shows(`.*${HOME.second}.*`),
  shows(`.*${TEAM_B}.*`),
  ...TO_TEAMS,
  tap(TEAM_B),
  tapsOn(es.teams.edit),
  see(es.team.field.name),
  scrollTo(DELETE),
  tapsOn(DELETE),
  see(TITLE),
  see(deleteTeamMessage(2, 1)),
  see(CONFIRM),
  see(es.common.cancel),
  OUTSIDE,
  see(TITLE),
  android(BACK),
  see(TITLE),
  tap(es.common.cancel),
  notSee(TITLE),
  see(DELETE),
  tapsOn(DELETE),
  see(TITLE),
  tapsOn(CONFIRM),
  notSee(TITLE),
  see(es.teams.new),
  see(TEAM_A),
  notSee(TEAM_B),
];

/** RF-015: the matches of the deleted team are gone from «Todos los partidos»; the others stay. */
export const ALL_MATCHES_AFTER: Step[] = [
  tap(es.matches.allTitle),
  shows(`.*${HOME.first}.*`),
  shows(`.*${HOME.fourth}.*`),
  hides(`.*${HOME.other}.*`),
  hides(`.*${TEAM_B}.*`),
];
