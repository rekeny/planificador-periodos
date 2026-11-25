// Steps of the tests of a deleted match leaving no screen of its own (F-D3-03, RF-029). This file
// holds no test calls. It adds to match-details-actions.ts without changing it. The stacks are the
// ones a restored session or repeated taps can build, besides the normal ones of T096:
//   - the grid as the ROOT of the stack (restored at `/matches/1`) with the details on it;
//   - the same with a second details screen of the same match pushed over the first;
//   - the team screen, the grid and two details screens of the same match.
// After a confirmed deletion no screen of the deleted match may stay in the stack, drawn or hidden.
import { act, screen, testRouter, waitFor } from "expo-router/testing-library";

import * as notFoundModule from "@/ui/not-found";
import { NOT_FOUND } from "./edit-team";
import {
  DELETE_CONFIRM,
  gridCells,
  matchIds,
  pressDelete,
  pressInDialog,
  recordStatuses,
} from "./match-details-actions";
import type { Seeded } from "./match-details";
import { openDetailsFromGrid } from "./match-details";

const HIDDEN = { includeHiddenElements: true } as const;

/** Where a deletion may leave the app when the match was the root of the stack: the list of teams or of every match. */
export const SAFE_ROOTS = /^(\/|\/matches)$/;

/** The grid is the root of the stack and the details are on it, as a restored stack builds it. */
export async function openDetailsOverRootGrid(seeded: Seeded): Promise<void> {
  await openDetailsFromGrid(seeded.matchId);
}

/** The same, with a second details screen of the same match pushed over the first one. */
export async function openTwoDetailsOverRootGrid(
  seeded: Seeded,
): Promise<void> {
  await openDetailsFromGrid(seeded.matchId);
  await testRouter.push(`/matches/${seeded.matchId}/edit`);
  await screen.findByLabelText("Local");
}

/** Counts the screens of «not found» and the statuses of the session from now on. */
export function watchTheWay(seeded: Seeded): {
  notFound: jest.SpyInstance;
  seen: string[];
  stop: () => void;
} {
  const notFound = jest.spyOn(notFoundModule, "NotFound");
  const { seen, stop } = recordStatuses(seeded.store);
  return { notFound, seen, stop };
}

/** «Borrar partido» and its confirmation, then lets the navigation settle. */
export async function deleteAndSettle(): Promise<void> {
  await pressDelete();
  await pressInDialog(DELETE_CONFIRM);
  await act(async () => undefined);
}

/** Whether any screen of the deleted match, hidden ones too, is still in the stack. */
export function matchScreensMounted(): boolean {
  return (
    gridCells().length > 0 ||
    screen.queryByRole("button", { name: "Deshacer", ...HIDDEN }) !== null ||
    screen.queryByLabelText("Local", HIDDEN) !== null
  );
}

/** Waits for the match to be gone from the database, which is the deletion having been saved. */
export async function waitForDeletion(seeded: Seeded): Promise<void> {
  await waitFor(() => expect(matchIds(seeded.db)).not.toContain(1));
}

/** What every deleted match must leave behind, wherever the app ends. */
export function expectNoTraceOfTheMatch(
  seeded: Seeded,
  way: ReturnType<typeof watchTheWay>,
): void {
  way.stop();
  expect(matchScreensMounted()).toBe(false);
  expect(screen).not.toHavePathname(
    expect.stringMatching(/^\/matches\/1(\/|$)/),
  );
  expect(seeded.store.getState().status).toBe("closed");
  expect(seeded.store.getState().view).toBeNull();
  expect(way.seen).not.toContain("notFound");
  expect(way.notFound).not.toHaveBeenCalled();
  expect(screen.queryByText(NOT_FOUND, HIDDEN)).toBeNull();
}
