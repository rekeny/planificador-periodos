// Steps of the tests of a deleted match leaving no screen of its own (F-D3-03, RF-029). This file
// holds no test calls. It adds to match-details-actions.ts without changing it. The stacks are the
// ones a restored session or repeated taps can build, besides the normal ones of T096:
//   - the grid as the ROOT of the stack (restored at `/matches/1`) with the details on it;
//   - the same with a second details screen of the same match pushed over the first;
//   - the team screen, the grid and two details screens of the same match.
// After a confirmed deletion no screen of the deleted match may stay in the stack, drawn or hidden.
import {
  act,
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
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
import { useMockSquadStore } from "./mock-app-stores";

// Not a hook: the alias keeps the rules-of-hooks lint from reading it as one.
const giveSquadStore = useMockSquadStore;

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

// F-D3-03b: the match also sits EARLIER in the stack, under other screens, not only at the top.
// Every stack ends with the grid of match 1 and its details on top, and the deletion is confirmed
// from those details. A route of match 1 deeper in the stack must go too, or Back reaches it.
export type EarlierStack = (seeded: Seeded) => Promise<void>;

/** The list of teams, which reads the squad store, as the root of the stack. */
async function openRoot(seeded: Seeded): Promise<void> {
  giveSquadStore(createSquadStore(seeded.db));
  await renderRouter("./src/app");
  await screen.findByRole("button", { name: "Nuevo equipo" });
}

async function pushAll(paths: readonly string[], last: string): Promise<void> {
  for (const path of paths) await testRouter.push(path);
  await screen.findByLabelText("Local");
  expect(screen).toHavePathname(last);
}

/** `/ → /matches/1 → /matches → /matches/1 → /matches/1/edit` (the stack of the Codex finding). */
export const grid_list_grid_details: EarlierStack = async (seeded) => {
  await openRoot(seeded);
  const grid = `/matches/${seeded.matchId}`;
  await pushAll([grid, "/matches", grid, `${grid}/edit`], `${grid}/edit`);
};

/** `/ → /matches/1 → /matches/1/edit → /matches → /matches/1 → /matches/1/edit`: the earlier occurrence has a details screen. */
export const details_list_grid_details: EarlierStack = async (seeded) => {
  await openRoot(seeded);
  const grid = `/matches/${seeded.matchId}`;
  const paths = [grid, `${grid}/edit`, "/matches", grid, `${grid}/edit`];
  await pushAll(paths, `${grid}/edit`);
};

/** `/ → /matches/1 → /teams/1 → /matches/1 → /matches/1/edit`: the earlier occurrence is under a team screen. */
export const grid_team_grid_details: EarlierStack = async (seeded) => {
  await openRoot(seeded);
  const grid = `/matches/${seeded.matchId}`;
  const paths = [grid, `/teams/${seeded.teamId}`, grid, `${grid}/edit`];
  await pushAll(paths, `${grid}/edit`);
};

/** Back until the stack is at its bottom: no step may reach a screen of the deleted match or «not found». */
export async function backThroughTheStack(): Promise<void> {
  for (let step = 0; step < 10 && testRouter.canGoBack(); step += 1) {
    await testRouter.back();
    expect(matchScreensMounted()).toBe(false);
    expect(screen).not.toHavePathname(
      expect.stringMatching(/^\/matches\/1(\/|$)/),
    );
    expect(screen.queryByText(NOT_FOUND, HIDDEN)).toBeNull();
  }
}
