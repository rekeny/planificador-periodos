import { callUpEntryFor } from "@/domain/call-up";
import type { Player } from "@/domain/squad";

const player = (id: number, name: string, number: string): Player => ({
  id,
  teamId: 1,
  name,
  number,
  isActive: true,
});

describe("callUpEntryFor", () => {
  it("RF-019 E-018: the entry copies the name and the number the player has now", () => {
    expect(callUpEntryFor(player(7, "Juan", "7"))).toEqual({
      playerId: 7,
      name: "Juan",
      number: "7",
    });
  });

  it("RF-019 E-018: Juan 7 enters the call-up, then becomes 9 in the squad: the entry still says 7", () => {
    const entry = { id: 1, ...callUpEntryFor(player(7, "Juan", "7")) };

    const juanNow = player(7, "Juan", "9");

    expect(entry.number).toBe("7");
    expect(callUpEntryFor(juanNow).number).toBe("9");
  });

  it("RF-019: a player added to an older match after the change enters with the new data", () => {
    const juan9 = player(7, "Juan Carlos", "9");

    expect(callUpEntryFor(juan9)).toMatchObject({
      name: "Juan Carlos",
      number: "9",
    });
  });

  it.each(["0", "00", "99", "07"])(
    "RF-019: the number %s is copied as it is, as text",
    (number) => {
      expect(callUpEntryFor(player(1, "Ana", number)).number).toBe(number);
    },
  );

  it("RF-019: the entry has no id, because the database assigns it", () => {
    expect(callUpEntryFor(player(1, "Ana", "4"))).not.toHaveProperty("id");
  });

  it("RF-019: the entry has only the player, name and number, with no other player data", () => {
    expect(Object.keys(callUpEntryFor(player(1, "Ana", "4"))).sort()).toEqual([
      "name",
      "number",
      "playerId",
    ]);
  });

  it("RF-019: it works the same for a deactivated player (the caller decides who may be added)", () => {
    const inactive = { ...player(1, "Ana", "4"), isActive: false };

    expect(callUpEntryFor(inactive)).toEqual({
      playerId: 1,
      name: "Ana",
      number: "4",
    });
  });
});
