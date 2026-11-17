// Steps of the two-team form navigation tests (fifth Codex review, finding 2, RF-013, RF-016). This
// file holds no test calls. A form of team A (edit or new player) is opened over the list of teams,
// the same form of team B is pushed over it and the coach goes Back to the first one: the form of A
// must show A's data and «Guardar» must save for A, never a false «No se ha encontrado».
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { listPlayers } from "@/data/player-repository";
import { listTeams } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import { NOT_FOUND } from "./edit-team";
import { ALEVIN, CADETE } from "./squad-fixtures";
import { seedTeam } from "./team-screen";

export type Kind = "edit" | "players/new";

/** Team 1 «Alevín A» (2015, 6 periods) with Ana, team 2 «Cadete B» (no category, 8) with Eva. */
export function seedBothTeams(db: AppDatabase): void {
  seedTeam(db, ALEVIN, [["Ana", "4"]]);
  seedTeam(db, CADETE, [["Eva", "5"]]);
}

/** The field that tells the two forms of a kind apart: «Nombre» for both, drawn once the team is known. */
const READY_LABEL = "Nombre";

/** Opens the form of `first`, then pushes the form of `second` over it and waits for it. */
export async function openThenPush(
  kind: Kind,
  first: number,
  second: number,
): Promise<void> {
  await renderRouter("./src/app");
  await screen.findByRole("button", { name: "Nuevo equipo" });
  await testRouter.push(`/teams/${first}/${kind}`);
  await screen.findByLabelText(READY_LABEL);
  await testRouter.push(`/teams/${second}/${kind}`);
  await screen.findByLabelText(READY_LABEL);
  expect(screen).toHavePathname(`/teams/${second}/${kind}`);
}

/** Back to the first form: its pathname is read and its fields must be drawn, not a not-found. */
export async function backToFirst(kind: Kind, first: number): Promise<void> {
  await testRouter.back();
  expect(screen).toHavePathname(`/teams/${first}/${kind}`);
  await waitFor(() => expect(screen.queryByText(NOT_FOUND)).toBeNull());
  await screen.findByLabelText(READY_LABEL);
}

export function textOf(label: string): unknown {
  return screen.getByLabelText(label).props.value;
}

/** The names and default formats of every team, in id order. */
export function teamRows(db: AppDatabase): [string, number][] {
  return listTeams(db).map((team) => [team.name, team.defaultFormat]);
}

/** The names of the players of one team, in the order the database holds them. */
export function playerNames(db: AppDatabase, teamId: number): string[] {
  return listPlayers(db, teamId).map((player) => player.name);
}

/** The squad store the screens use, on that database. */
export function squadStoreOn(
  db: AppDatabase,
): ReturnType<typeof createSquadStore> {
  return createSquadStore(db);
}
