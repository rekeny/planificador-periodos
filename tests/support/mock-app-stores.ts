// The replacement of `@/state/app-stores` for screen tests (T034 and the screen tests after it):
// `jest.mock("@/state/app-stores", () => jest.requireActual("../support/mock-app-stores")
// .mockAppStoresModule())`. A test gives the store its screens read with `useMockSquadStore`,
// usually a real store on the in-memory database of `mock-database.ts`. This file holds no tests.
import type { NewMatchDraft } from "./new-match-fixtures";
import type { SquadStore } from "./squad-fixtures";

let current: SquadStore | undefined;
let currentDraft: NewMatchDraft | undefined;

/** The squad store that `getSquadStore()` hands out from now on. */
export function useMockSquadStore(store: SquadStore): void {
  current = store;
}

/** The new-match draft that `getNewMatchDraft()` hands out from now on (T043). Not named `use…`: ESLint would read it as a hook. */
export function setMockNewMatchDraft(draft: NewMatchDraft): void {
  currentDraft = draft;
}

export function mockAppStoresModule(): {
  getSquadStore: () => SquadStore;
  getNewMatchDraft: () => NewMatchDraft;
} {
  return {
    getNewMatchDraft: () => {
      if (currentDraft === undefined) {
        throw new Error("The test gave no new-match draft");
      }
      return currentDraft;
    },
    getSquadStore: () => {
      if (current === undefined) {
        throw new Error("The test gave no squad store");
      }
      return current;
    },
  };
}
