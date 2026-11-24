// The whole journey of the US7 flow (T078) as an ordered list of scenes, and the check that the flow
// does it. A scene starts where the one before it ended.
import { missingStep } from "./us6-flow";
import type { Step } from "./us6-flow";
import { commands7, present } from "./us7-flow";
import {
  DEACTIVATE,
  EDIT_JUAN,
  FIRST_MATCH,
  NEW_MATCH_9,
  OLD_MATCH,
  OTHER_TEAM_KEEPS,
  SETUP,
  WITHOUT_ANA,
} from "./us7-scenes";
import { ALL_MATCHES_AFTER, DELETE_TEAM, REACTIVATE } from "./us7-scenes-last";

const SCENES = {
  setup: SETUP,
  first: FIRST_MATCH,
  edit: EDIT_JUAN,
  otherTeam: OTHER_TEAM_KEEPS,
  old: OLD_MATCH,
  new9: NEW_MATCH_9,
  deactivate: DEACTIVATE,
  withoutAna: WITHOUT_ANA,
  reactivate: REACTIVATE,
  deleteTeam: DELETE_TEAM,
  afterDelete: ALL_MATCHES_AFTER,
};
type Scene = keyof typeof SCENES;

/** The scenes in the order of the journey up to and including `last`. */
export function through(last: Scene): Step[] {
  const names = Object.keys(SCENES) as Scene[];
  return names.slice(0, names.indexOf(last) + 1).flatMap((n) => SCENES[n]);
}

/** The flow file exists and does the journey up to `last`, in order, on iOS and on Android. */
export function expectJourney(last: Scene): void {
  expect(present()).toBe(true);
  expect(missingStep(through(last), commands7())).toBeNull();
}
