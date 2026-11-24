// The second half of the journey of the US6 flow (T073): the saved match is edited, its format is
// changed and it is deleted. Same rules as us6-scenes.ts.
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
  DELETE_TITLE,
  LEAVE_DETAILS,
  ROW_ANDROID,
  ROW_IOS,
  TEAM_A,
  TITLE,
  TO_TEAMS,
  blank,
  c,
  marked,
  toTeam,
} from "./us6-scenes";

/** RF-028, RF-083, E-032: edit home, away and score, clear the time, then «Guardar». */
export const EDIT: Step[] = [
  tap(es.common.edit),
  see(es.match.field.format),
  type("Cóndores"),
  type("Rivales"),
  type("72"),
  type("65"),
  scrollTo(es.match.field.time),
  ios(see("12:00")),
  android(see("18:30")),
  tap(es.match.clearTime),
  see(es.match.noTime),
  see(es.match.addTime),
  notSee(es.match.clearTime),
  ios(notSee("12:00")),
  android(notSee("18:30")),
  see("01/03/2026"),
  scrollTo(es.common.save),
  tap(es.common.save),
  notSee(es.common.save),
  marked("Ana", "P1"),
  ...toTeam(TEAM_A),
  see(".*Cóndores – Rivales.*"),
  see(".*72–65.*"),
  notSee(".*Águilas.*"),
  see(".*01/03/2026.*"),
  ios(notSee(ROW_IOS)),
  android(notSee(ROW_ANDROID)),
];

const dialogClosings = (title: string, cancel: Step[]): Step[] => [
  OUTSIDE,
  see(title),
  android(BACK),
  see(title),
  ...cancel,
];

/** RF-039, E-016, criterion 5: 8 -> 4 confirmed and the details left with no «Guardar». */
export const FORMAT_TO_4: Step[] = [
  tapsOn(".*Cóndores.*"),
  marked("Ana", "P5"),
  tap(es.common.edit),
  see(es.match.field.format),
  type("Gigantes"),
  tap("4 periodos"),
  see(TITLE),
  see(es.confirm.formatChange.message),
  see(es.confirm.formatChange.confirm),
  see(es.common.cancel),
  ...dialogClosings(TITLE, [
    tap(es.common.cancel),
    notSee(TITLE),
    see("Gigantes"),
  ]),
  tap("4 periodos"),
  see(TITLE),
  tap(es.confirm.formatChange.confirm),
  notSee(TITLE),
  { never: tap(es.common.save) },
  ...LEAVE_DETAILS,
  blank("Ana", "P4"),
  notSee(c("Ana", "P5", "empty")),
  notSee(c("Ana", "P5", "starter")),
  marked("Ana", "P1"),
  ...toTeam(TEAM_A),
  see(".*4 periodos.*"),
  see(".*Cóndores.*"),
  notSee(".*Gigantes.*"),
];

/** RF-039, RF-040, E-016: the current format asks nothing; 4 -> 8 asks, and the P5 mark is gone. */
export const FORMAT_TO_8: Step[] = [
  tapsOn(".*Cóndores.*"),
  tap(es.common.edit),
  see(es.match.field.format),
  tap("4 periodos"),
  notSee(TITLE),
  notSee(es.confirm.formatChange.confirm),
  tap("8 periodos"),
  see(TITLE),
  tap(es.confirm.formatChange.confirm),
  notSee(TITLE),
  ...LEAVE_DETAILS,
  blank("Ana", "P5"),
  marked("Ana", "P1"),
];

/** RF-029: the match is opened from «Todos los partidos» and deleted after the confirmation. */
export const DELETE: Step[] = [
  ...toTeam(TEAM_A),
  ...TO_TEAMS,
  tap(es.matches.allTitle),
  tapsOn(".*Cóndores.*"),
  marked("Ana", "P1"),
  tap(es.common.edit),
  see(es.match.field.format),
  scrollTo(es.match.delete),
  tapsOn(es.match.delete),
  see(DELETE_TITLE),
  see(es.confirm.deleteMatch.message),
  see(es.common.cancel),
  ...dialogClosings(DELETE_TITLE, [
    tap(es.common.cancel),
    notSee(DELETE_TITLE),
    see(es.match.delete),
  ]),
  tapsOn(es.match.delete),
  see(DELETE_TITLE),
  tapsOn(es.confirm.deleteMatch.confirm),
  notSee(DELETE_TITLE),
  notSee(".*Cóndores.*"),
  see(".*Zorros.*"),
  ...TO_TEAMS,
  tap(TEAM_A),
  see(es.matches.empty),
  notSee(".*Cóndores.*"),
];
