// Steps of the new-team screen tests (T034). This file holds no test calls. Assumed screen: the
// list of teams has a button named «Nuevo equipo»; the form has two text fields labelled «Nombre»
// and «Categoría», a group of three radios «4 periodos», «6 periodos» and «8 periodos» (the chosen
// one has `checked: true`) and a button «Guardar».
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { listTeams } from "@/data/team-repository";

export const SAVE_FAILED =
  "No se ha podido guardar el cambio. Inténtalo de nuevo.";
export const NAME_REQUIRED = "Escribe un nombre.";

export async function openApp(): Promise<void> {
  await renderRouter("./src/app");
}

/** Opens the app on the list and taps «Nuevo equipo». */
export async function openForm(): Promise<void> {
  await openApp();
  await fireEvent.press(
    await screen.findByRole("button", { name: "Nuevo equipo" }),
  );
  await screen.findByLabelText("Nombre");
}

export async function typeName(text: string): Promise<void> {
  await fireEvent.changeText(screen.getByLabelText("Nombre"), text);
}

export async function typeCategory(text: string): Promise<void> {
  await fireEvent.changeText(screen.getByLabelText("Categoría"), text);
}

export async function chooseFormat(periods: number): Promise<void> {
  await fireEvent.press(
    screen.getByRole("radio", { name: `${periods} periodos` }),
  );
}

export function saveButton(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole("button", { name: "Guardar" });
}

export async function pressSave(): Promise<void> {
  await fireEvent.press(saveButton());
}

export function isFormatChosen(periods: number): boolean {
  return (
    screen.queryByRole("radio", {
      name: `${periods} periodos`,
      checked: true,
    }) !== null
  );
}

/** What the database holds, as plain rows, whatever store wrote it. */
export function savedTeams(
  db: AppDatabase,
): { name: string; category: string | null; defaultFormat: number }[] {
  return listTeams(db).map(({ name, category, defaultFormat }) => ({
    name,
    category,
    defaultFormat,
  }));
}

/** Fills the form and presses «Guardar», as the coach would. */
export async function createViaForm(
  name: string,
  category = "",
  periods?: number,
): Promise<void> {
  await typeName(name);
  if (category !== "") {
    await typeCategory(category);
  }
  if (periods !== undefined) {
    await chooseFormat(periods);
  }
  await pressSave();
}
