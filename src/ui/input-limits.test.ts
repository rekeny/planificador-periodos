import {
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  NUMBER_MAX_LENGTH,
  SCORE_MAX_LENGTH,
} from "@/ui/input-limits";

describe("input limits", () => {
  it("RF-013 RF-016 RF-025 E-022: names stop at 40 characters, notes at 500, a score at 3 digits and a player number at 2", () => {
    expect(NAME_MAX_LENGTH).toBe(40);
    expect(NOTES_MAX_LENGTH).toBe(500);
    expect(SCORE_MAX_LENGTH).toBe(3);
    expect(NUMBER_MAX_LENGTH).toBe(2);
  });
});
