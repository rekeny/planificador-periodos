// Steps of the new-match form tests (T043). This file holds no test calls. Assumed screen: the
// team screen has a button «Nuevo partido» that opens `/teams/<id>/matches/new`. The form has text
// fields labelled «Local», «Visitante» and «Notas», two score fields that both carry the label
// «Resultado final» (home first, away second: the task lists no other text), the text «Variante»
// over the format radios «4 periodos», «6 periodos», «8 periodos», and the buttons «Mi equipo es
// local» and «Mi equipo es visitante». The route reads its team from the URL and resets the draft
// (`getNewMatchDraft()` of `@/state/app-stores`) when it opens. There is no «Guardar» until T044.
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { createNewMatchDraft } from "@/state/new-match-draft";
import { setMockNewMatchDraft } from "./mock-app-stores";
import { clockAt } from "./new-match-fixtures";
import type { NewMatchDraft } from "./new-match-fixtures";
import { ALEVIN, CADETE } from "./squad-fixtures";
import { seedTeam } from "./team-screen";

export const SCORE_INCOMPLETE = "Escribe los dos resultados o ninguno.";
const SCORE_LABEL = "Resultado final";

/** A new draft on the database, with a clock on 2026-11-11, handed out by `getNewMatchDraft()`. */
export function freshDraft(db: AppDatabase): NewMatchDraft {
  const draft = createNewMatchDraft(db, clockAt(2026, 11, 11).read);
  setMockNewMatchDraft(draft);
  return draft;
}

/** Two teams, «Alevín A» (default 6 periods, id 1) and «Cadete B» (default 8, id 2). */
export function seedTeams(db: AppDatabase): { alevin: number; cadete: number } {
  return {
    alevin: seedTeam(db, ALEVIN, [["Ana", "4"]]),
    cadete: seedTeam(db, CADETE, [["Eva", "5"]]),
  };
}

/** The form as the only screen of the stack, as a deep link or a restored session would open it. */
export async function openFormAlone(teamId: number): Promise<void> {
  await renderRouter("./src/app", {
    initialUrl: `/teams/${teamId}/matches/new`,
  });
  await screen.findByLabelText("Local");
}

/** The list, then «Alevín A», then the form with the button «Nuevo partido», as the coach would. */
export async function openFormFromTeam(name: string): Promise<void> {
  await renderRouter("./src/app");
  await fireEvent.press(await screen.findByText(name));
  await pressNewMatch();
}

export async function pressNewMatch(): Promise<void> {
  await fireEvent.press(
    await screen.findByRole("button", { name: "Nuevo partido" }),
  );
  await screen.findByLabelText("Local");
}

export const homeField = () => screen.getByLabelText("Local");
export const awayField = () => screen.getByLabelText("Visitante");
export const notesField = () => screen.getByLabelText("Notas");

/** The two score fields, home first. */
export function scoreFields(): ReturnType<typeof screen.getAllByLabelText> {
  return screen.getAllByLabelText(SCORE_LABEL);
}

export async function typeIn(
  field: ReturnType<typeof screen.getByLabelText>,
  text: string,
): Promise<void> {
  await fireEvent.changeText(field, text);
}

export async function pressQuick(side: "home" | "away"): Promise<void> {
  const name =
    side === "home" ? "Mi equipo es local" : "Mi equipo es visitante";
  await fireEvent.press(screen.getByRole("button", { name }));
}

export async function chooseFormatInForm(periods: number): Promise<void> {
  await fireEvent.press(
    screen.getByRole("radio", { name: `${periods} periodos` }),
  );
}

export function checkedFormats(): number[] {
  return [4, 6, 8].filter(
    (periods) =>
      screen.queryByRole("radio", {
        name: `${periods} periodos`,
        checked: true,
      }) !== null,
  );
}

/** «Quitar hora» of the date and time slot (T082). */
export async function pressClearTime(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Quitar hora" }));
}

/** «Añadir hora» of the date and time slot (T089): the only way to a time on a form without one. */
export async function pressAddTime(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Añadir hora" }));
}

/** Every text on screen that looks like a time, «HH:MM» (T082): empty when no time is chosen. */
export function shownTimes(): string[] {
  return screen
    .queryAllByText(/^\d{2}:\d{2}$/)
    .map((node) => String(node.props.children));
}
