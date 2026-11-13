// The replacement of `@/state/app-stores` for screen tests (T034 and the screen tests after it):
// `jest.mock("@/state/app-stores", () => jest.requireActual("../support/mock-app-stores")
// .mockAppStoresModule())`. A test gives the store its screens read with `useMockSquadStore`,
// usually a real store on the in-memory database of `mock-database.ts`. This file holds no tests.
import type { SquadStore } from "./squad-fixtures";

let current: SquadStore | undefined;

/** The squad store that `getSquadStore()` hands out from now on. */
export function useMockSquadStore(store: SquadStore): void {
  current = store;
}

export function mockAppStoresModule(): { getSquadStore: () => SquadStore } {
  return {
    getSquadStore: () => {
      if (current === undefined) {
        throw new Error("The test gave no squad store");
      }
      return current;
    },
  };
}
