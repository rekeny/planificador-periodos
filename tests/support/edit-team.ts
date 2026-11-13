// Steps of the edit-team screen tests (T081). This file holds no test calls. Assumed screen: the
// route `/teams/<id>/edit` shows the same form as the new-team screen (fields «Nombre» and
// «Categoría», radios «N periodos», button «Guardar»), filled with the saved team. There is no
// link to it yet (T035 adds it), so the tests open it with a push on top of the list of teams.
import { sql } from "drizzle-orm";
import { renderRouter, screen, testRouter } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";

export const NOT_FOUND = "No se ha encontrado: puede que se haya borrado.";

/** The list of teams first, then the edit route pushed on top of it, as the team screen will. */
export async function openEdit(id: number | string): Promise<void> {
  await renderRouter("./src/app");
  await screen.findByRole("button", { name: "Nuevo equipo" });
  await testRouter.push(`/teams/${id}/edit`);
}

/** The edit route as the only screen, as a deep link or a restored session would open it. */
export async function openEditAlone(id: number | string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: `/teams/${id}/edit` });
}

/** The edit route is open and its form has been filled with the saved team. */
export async function formReady(): Promise<void> {
  await screen.findByLabelText("Nombre");
}

/** Removes a team behind the app's back, as a deleted team would be gone (no delete exists yet). */
export function deleteTeamDirectly(db: AppDatabase, id: number): void {
  db.run(sql.raw(`DELETE FROM teams WHERE id = ${id}`));
}
