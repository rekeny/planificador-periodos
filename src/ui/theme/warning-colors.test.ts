// T059: the minimal colour file (docs/architecture.md, "Visual design"). It exports the two
// colours the warnings use, as `#rrggbb` strings: LIGHT_RED for the cells that should not be marked
// (RF-062) and RED for the player breaking a minimum (RF-063, RF-064).
import { LIGHT_RED, RED } from "@/ui/theme/warning-colors";

const HEX = /^#[0-9a-f]{6}$/i;

function channels(colour: string): [number, number, number] {
  const n = parseInt(colour.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const brightness = (colour: string) => {
  const [r, g, b] = channels(colour);
  return r + g + b;
};

describe("warning colours", () => {
  it.each([
    ["light red", LIGHT_RED],
    ["red", RED],
  ])(
    "RF-062 RF-063: the %s is a #rrggbb colour whose red channel is the strongest",
    (_name, colour) => {
      expect(colour).toMatch(HEX);
      const [r, g, b] = channels(colour);
      expect(r).toBeGreaterThan(g);
      expect(r).toBeGreaterThan(b);
    },
  );

  it("RF-062 RF-063: the light red is a different, lighter colour than the red of the player, so the two warnings are told apart", () => {
    expect(LIGHT_RED.toLowerCase()).not.toBe(RED.toLowerCase());
    expect(brightness(LIGHT_RED)).toBeGreaterThan(brightness(RED));
  });
});
