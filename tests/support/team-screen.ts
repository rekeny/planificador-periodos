// Steps of the team-screen and new-player tests (T035). This file holds no test calls. Assumed
// screens: the team screen (`/teams/<id>`) draws one row per player with the number and the name
// as Texts (in that order), a button «Editar», a button «Nuevo jugador», optionally a heading
// «Jugadores», and the duplicate-number banner as one Text. The new-player route
// (`/teams/<id>/players/new`) has fields labelled «Nombre» and «Dorsal» and a button «Guardar».
// Tests that read the Texts of the team screen open it as the only screen of the stack, because
// the screens under it stay drawn and would add their own Texts.
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { listPlayers } from "@/data/player-repository";
import { listTeams } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import { headerConfigs, screenTexts } from "./screen-reading";
import { addPlayers } from "./squad-fixtures";
import type { TeamInput } from "./squad-fixtures";
import { pressSave } from "./new-team-form";

export const NUMBER_INVALID =
  "El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.";
export const DUPLICATE_BANNER = /Hay jugadores con el mismo dorsal/;
// The «Partidos» heading and its empty text (T099) are chrome too: `playerOrder` reads the players.
const CHROME = [
  "Editar",
  "Nuevo jugador",
  "Nuevo partido",
  "Jugadores",
  "Partidos",
  "Todavía no hay partidos.",
];

type Players = readonly (readonly [string, string])[];

/** Creates the team and its players behind the app's back, as a store on another run would. */
export function seedTeam(
  db: AppDatabase,
  team: TeamInput,
  players: Players = [],
): number {
  const seeder = createSquadStore(db);
  seeder.getState().createTeam(team);
  // The team just created has the highest id, even if another team has the same name.
  const id = Math.max(...listTeams(db).map((candidate) => candidate.id));
  seeder.getState().openTeam(id);
  addPlayers(seeder, players);
  return id;
}

/** The team screen as the only screen of the stack, once it shows its buttons. */
export async function openTeamAlone(id: number | string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: `/teams/${id}` });
  await screen.findByRole("button", { name: "Nuevo jugador" });
}

/** The new-player form, opened from the team screen with its button. */
export async function openPlayerForm(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Nuevo jugador" }));
  await screen.findByLabelText("Dorsal");
}

/** The new-player route as the only screen, as a deep link would open it. */
export async function openPlayerFormAlone(id: number | string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: `/teams/${id}/players/new` });
}

export async function typePlayerName(text: string): Promise<void> {
  await fireEvent.changeText(screen.getByLabelText("Nombre"), text);
}

/**
 * Types into the number field as the keyboard does: the native `maxLength` of the field cuts the
 * text (D42), which the test double of TextInput does not do by itself.
 */
export async function typeNumber(text: string): Promise<void> {
  const field = screen.getByLabelText("Dorsal");
  const limit: unknown = field.props.maxLength;
  const typed = typeof limit === "number" ? text.slice(0, limit) : text;
  await fireEvent.changeText(field, typed);
}

/** Types the player and presses «Guardar», as the coach would. */
export async function addViaForm(name: string, number: string): Promise<void> {
  await typePlayerName(name);
  await typeNumber(number);
  await pressSave();
}

/**
 * The players as drawn, top to bottom, as "number name" pairs joined by spaces: the Texts of the
 * screen without its buttons, heading and banner. It does not depend on whether a row is one Text
 * or two.
 */
export function playerOrder(): string {
  return screenTexts()
    .filter((text) => !CHROME.includes(text) && !DUPLICATE_BANNER.test(text))
    .join(" ");
}

export function bannerTexts(): string[] {
  return screenTexts().filter((text) => DUPLICATE_BANNER.test(text));
}

export function headerTitles(): unknown[] {
  return headerConfigs().map((config) => config.title);
}

/** What the database holds for the team, as plain rows in database order. */
export function savedPlayers(
  db: AppDatabase,
  teamId: number,
): { name: string; number: string }[] {
  return listPlayers(db, teamId).map(({ name, number }) => ({ name, number }));
}
