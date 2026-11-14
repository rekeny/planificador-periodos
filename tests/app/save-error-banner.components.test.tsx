// Third Codex review, finding 2 (BLOCKING): after a failed save the banner must not cover
// «Guardar» (RF-085, RF-076). The team form and the player form are rendered alone with a counting
// stub for `onSave` that always fails, so «Guardar» can be pressed again. Position and structure:
// tests/support/save-error-banner.ts. The existing tests only read the banner's text.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { PlayerForm } from "@/ui/player-form";
import { TeamForm } from "@/ui/team-form";
import { expectBannerInFlow } from "../support/save-error-banner";

const INITIAL = { name: "Alevín A", category: "", defaultFormat: 6 } as const;

async function pressSave(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
}

describe("the save-error banner in the forms", () => {
  it("RF-085 RF-076: the team form's banner is in normal flow and «Guardar» still runs a second save", async () => {
    const onSave = jest.fn(() => ({ kind: "saveFailed" }) as const);
    await render(<TeamForm initialValues={INITIAL} onSave={onSave} />);
    await pressSave();
    expectBannerInFlow();
    await pressSave();
    expect(onSave).toHaveBeenCalledTimes(2);
    expectBannerInFlow();
  });

  it("RF-085 RF-076: the player form's banner is in normal flow and «Guardar» still runs a second save", async () => {
    const onSave = jest.fn(() => ({ kind: "saveFailed" }) as const);
    await render(<PlayerForm onSave={onSave} />);
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Eva");
    await fireEvent.changeText(screen.getByLabelText("Dorsal"), "5");
    await pressSave();
    expectBannerInFlow();
    await pressSave();
    expect(onSave).toHaveBeenCalledTimes(2);
    expectBannerInFlow();
  });
});
