// The journey of the US6 flow (T073) as scenes, each a list of steps that must appear in order (see
// us6-flow.ts). Between two steps the flow may have more commands (scrolls, keyboard closing,
// waits). The Alevín A match is 8 periods, 1 March 2026; «Cadete B» has one match of today.
import es from "@/i18n/es.json";
import { UNDO, UNDO_OFF, cell } from "./us3-flow";
import {
  BACK,
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

export const PLAYERS = ["Ana", "Bea", "Carla"] as const;
export const TEAM_A = "Alevín A";
export const TEAM_B = "Cadete B";
export const TITLE = es.confirm.formatChange.title;
export const DELETE_TITLE = es.confirm.deleteMatch.title;
export const PICKER_TEXTS = {
  previousMonth: "(?i)change to previous month|cambiar al mes anterior",
  march1: "(?i).*(march 1, 2026|1 de marzo de 2026).*",
  hour18: "(?i)18 hours?|18 horas?",
  minutes30: "(?i)30 minutes?|30 minutos?",
  iosDate: "(?i)date picker|selector de fecha",
  iosPrevious: "(?i)previous.*|anterior.*",
};
/** What the lists show of match A: the date and the time the picker gave (12:00 on iOS, 18:30 on Android). */
export const ROW_IOS = ".*01/03/2026 12:00.*";
export const ROW_ANDROID = ".*01/03/2026 18:30.*";
export const TODAY_ROW = ".*${output.today}.*";

export const c = (
  name: string,
  period: string,
  state: "empty" | "starter" | "sub",
) => cell(name, period, state);
export const marked = (name: string, period: string): Step =>
  see(c(name, period, "starter"));
export const blank = (name: string, period: string): Step =>
  see(c(name, period, "empty"));
export const tapCell = (name: string, period: string): Step =>
  tap(c(name, period, "empty"));

/** Leaving the match details with no «Guardar»: Android Back, or the iOS sheet swiped down. */
export const LEAVE_DETAILS: Step[] = [
  android(BACK),
  ios(/^- swipe:; start: 50%, 12%/),
];
export const toTeam = (team: string): Step[] => [android(BACK), ios(tap(team))];
export const TO_TEAMS: Step[] = [android(BACK), ios(tap(es.teams.title))];

export const SETUP: Step[] = [
  tap(es.teams.new),
  type(TEAM_A),
  tap(es.common.save),
  tap(es.teams.new),
  type(TEAM_B),
  tap(es.common.save),
  tap(TEAM_A),
  ...PLAYERS.flatMap((name) => [
    tap(es.players.new),
    type(name),
    tap(es.common.save),
  ]),
];

/** E-032, first half: a match of 8 periods on 1 March 2026 with the time the picker gives. */
export const CREATE: Step[] = [
  tap(es.matches.new),
  tap("8 periodos"),
  android(tap(es.match.field.date)),
  android(tap(PICKER_TEXTS.previousMonth)),
  android(tap(PICKER_TEXTS.march1)),
  android(tap(es.common.accept)),
  ios(tap(PICKER_TEXTS.iosDate)),
  ios(tap(PICKER_TEXTS.iosPrevious)),
  ios(tap("1")),
  see("01/03/2026"),
  scrollTo(es.match.field.time),
  see(es.match.noTime),
  see(es.match.addTime),
  notSee(es.match.clearTime),
  tap(es.match.addTime),
  ios(see("12:00")),
  android(tap(PICKER_TEXTS.hour18)),
  android(tap(PICKER_TEXTS.minutes30)),
  android(tap(es.common.accept)),
  android(see("18:30")),
  see(es.match.clearTime),
  type("Águilas"),
  type("Rival"),
  scrollTo(es.common.save),
  tap(es.common.save),
  see(es.callUp.title),
];

/** RF-028, RF-057: marks, then «Editar» and back, and «Deshacer» removes the last mark. */
export const MARKS: Step[] = [
  tapCell("Ana", "P1"),
  marked("Ana", "P1"),
  tapCell("Ana", "P5"),
  marked("Ana", "P5"),
  tapCell("Bea", "P2"),
  marked("Bea", "P2"),
  tap(es.common.edit),
  see(es.match.field.format),
  ...LEAVE_DETAILS,
  notSee(es.match.field.format),
  marked("Bea", "P2"),
  UNDO,
  blank("Bea", "P2"),
  marked("Ana", "P5"),
  marked("Ana", "P1"),
];

const ONCE_A = /^- assertNotVisible:; text: "\.\*Águilas\.\*"; index: 1$/;
/** Review P-30: Back from the grid of a new match lists it once and not the form. */
export const LISTED_ONCE: Step[] = [
  ...toTeam(TEAM_A),
  see(es.matches.new),
  notSee(es.common.save),
  see(".*Águilas.*"),
  ONCE_A,
];

export const SECOND_TEAM: Step[] = [
  ...TO_TEAMS,
  tap(TEAM_B),
  tap(es.matches.new),
  type("Zorros"),
  tap(es.common.save),
  see(es.callUp.title),
  ...toTeam(TEAM_B),
  ...TO_TEAMS,
];

/** RF-074, RF-075, RF-083, E-032 lists half: every match, and the team's own. */
export const LISTS: Step[] = [
  tap(es.matches.allTitle),
  see(".*Zorros.*"),
  see(".*Águilas.*"),
  /^- assertVisible:; text: "\.\*Águilas\.\*"; below: "\.\*Zorros\.\*"$/,
  see(`.*${TEAM_A}.*`),
  see(`.*${TEAM_B}.*`),
  see(TODAY_ROW),
  ios(see(ROW_IOS)),
  android(see(ROW_ANDROID)),
  see(".*6 periodos.*"),
  see(".*8 periodos.*"),
  ...TO_TEAMS,
  tap(TEAM_A),
  see(es.team.matches),
  see(".*Águilas.*"),
  notSee(".*Zorros.*"),
  notSee(`.*${TEAM_B}.*`),
];

/** E-019: the app is closed and opened again, and the match is reached through the lists. */
export const REOPEN: Step[] = [
  "- stopApp",
  "- launchApp",
  see(es.teams.new),
  see(TEAM_A),
  tap(TEAM_A),
  tapsOn(".*Águilas.*"),
  marked("Ana", "P1"),
  marked("Ana", "P5"),
  blank("Bea", "P2"),
  UNDO_OFF,
];
