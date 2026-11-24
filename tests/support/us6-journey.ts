// The whole journey of the US6 flow (T073) as an ordered list of scenes, and the check that the flow
// does it. A scene starts where the one before it ended.
import {
  CREATE,
  LISTED_ONCE,
  LISTS,
  MARKS,
  REOPEN,
  SECOND_TEAM,
  SETUP,
} from "./us6-scenes";
import { DELETE, EDIT, FORMAT_TO_4, FORMAT_TO_8 } from "./us6-scenes-saved";
import { missingStep, present } from "./us6-flow";
import type { Step } from "./us6-flow";

const SCENES = {
  setup: SETUP,
  create: CREATE,
  marks: MARKS,
  once: LISTED_ONCE,
  second: SECOND_TEAM,
  lists: LISTS,
  reopen: REOPEN,
  edit: EDIT,
  to4: FORMAT_TO_4,
  to8: FORMAT_TO_8,
  remove: DELETE,
};
type Scene = keyof typeof SCENES;

/** The scenes in the order of the journey up to and including `last`: a scene starts where the one before it ended. */
export function through(last: Scene): Step[] {
  const names = Object.keys(SCENES) as Scene[];
  return names.slice(0, names.indexOf(last) + 1).flatMap((n) => SCENES[n]);
}

/** The flow file exists and does the journey up to `last`, in order, on iOS and on Android. */
export function expectJourney(last: Scene): void {
  expect(present()).toBe(true);
  expect(missingStep(through(last))).toBeNull();
}
