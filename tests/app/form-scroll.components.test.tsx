// Codex re-run, IMPORTANT: the team form and the player form scroll and avoid the keyboard
// (RF-076). Each form is rendered alone with a stub for `onSave`, so every message can be forced.
// The structure is in tests/support/form-scroll.ts: testIDs "form-keyboard-avoiding" and
// "form-scroll", which do not exist yet.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { SaveResult } from "@/state/save-result";
import { PlayerForm } from "@/ui/player-form";
import { TeamForm } from "@/ui/team-form";
import {
  KEYBOARD_AWARE,
  inScroll,
  reachable,
  structure,
} from "../support/form-scroll";

const NAME_REQUIRED = "Escribe un nombre.";
const NUMBER_INVALID =
  "El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.";
const SAVE_FAILED = "No se ha podido guardar el cambio. Inténtalo de nuevo.";
const INITIAL = { name: "", category: "", defaultFormat: 6 } as const;

async function pressSave(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
}

describe("team form, scrollable and keyboard-aware", () => {
  const renderForm = async (result: SaveResult): Promise<void> => {
    await render(<TeamForm initialValues={INITIAL} onSave={() => result} />);
  };

  it("RF-076: the team form is a ScrollView with keyboardShouldPersistTaps «handled» inside a KeyboardAvoidingView", async () => {
    await renderForm({ kind: "saved" });
    expect(structure()).toEqual(KEYBOARD_AWARE);
  });

  it("RF-076: the team form's fields, format radios and «Guardar» are all inside the scroll container", async () => {
    await renderForm({ kind: "saved" });
    const labels = ["Nombre", "Categoría", "4 periodos", "Guardar"];
    expect(reachable(labels).filter((one) => !one.inside)).toEqual([]);
  });

  it("RF-076 RF-012: the message «Escribe un nombre.» is inside the scroll container", async () => {
    await renderForm({ kind: "invalid", errors: ["nameRequired"] });
    await screen.findByLabelText("Nombre");
    await pressSave();
    expect(inScroll().queryByText(NAME_REQUIRED)).not.toBeNull();
  });

  it("RF-076 RF-085: the save-error banner is inside the scroll container", async () => {
    await renderForm({ kind: "saveFailed" });
    await screen.findByLabelText("Nombre");
    await pressSave();
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
  });
});

describe("player form, scrollable and keyboard-aware", () => {
  const renderForm = async (result: SaveResult): Promise<void> => {
    await render(<PlayerForm onSave={() => result} />);
  };

  it("RF-076: the player form is a ScrollView with keyboardShouldPersistTaps «handled» inside a KeyboardAvoidingView", async () => {
    await renderForm({ kind: "saved" });
    expect(structure()).toEqual(KEYBOARD_AWARE);
  });

  it("RF-076: the player form's «Nombre», «Dorsal» and «Guardar» are all inside the scroll container", async () => {
    await renderForm({ kind: "saved" });
    const labels = ["Nombre", "Dorsal", "Guardar"];
    expect(reachable(labels).filter((one) => !one.inside)).toEqual([]);
  });

  it("RF-076 RF-016: both validation messages are inside the scroll container", async () => {
    await renderForm({
      kind: "invalid",
      errors: ["nameRequired", "numberInvalid"],
    });
    await screen.findByLabelText("Nombre");
    await pressSave();
    expect(inScroll().queryByText(NAME_REQUIRED)).not.toBeNull();
    expect(inScroll().queryByText(NUMBER_INVALID)).not.toBeNull();
  });

  it("RF-076 RF-085: the save-error banner is inside the scroll container", async () => {
    await renderForm({ kind: "saveFailed" });
    await screen.findByLabelText("Nombre");
    await pressSave();
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
  });
});
