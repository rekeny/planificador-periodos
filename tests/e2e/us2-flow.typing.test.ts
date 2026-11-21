// Static checks of how the Maestro flow of T048 (US2) types its long texts. Maestro gives each
// command 120 s and typing took 0.18 to 0.6 s per character on an Android 17 emulator, so the 501
// characters of the notes (E-022) are typed in consecutive pieces (small-change-maestro-us2-android-notes.md).
import { typedRuns } from "../support/us2-flow";

describe("T048 Maestro US2 flow, long texts typed in pieces (RF-025, E-022)", () => {
  it("RF-025 E-022: the 501 characters of the notes are typed in consecutive pieces of at most 170 characters, so no command reaches Maestro's 120 s on Android", () => {
    const runs = typedRuns().filter((run) => run.join("").length === 501);
    expect(runs).toHaveLength(1);
    const [pieces = []] = runs;
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(170);
    }
  });
});
