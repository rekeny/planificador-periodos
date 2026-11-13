// T040: the call-up selection of the new-match draft (RF-030, RF-031, RF-068, E-015, E-030).
// Every active player is listed and selected, the coach deselects, and the range of the format is
// only a warning: nothing is ever blocked.
import { createPlayer } from "@/data/player-repository";
import {
  addSquad,
  deactivate,
  listedNumbers,
  newDraft,
  openedDraft,
  selectedCount,
  selectedNumbers,
  teamOf,
} from "../../tests/support/new-match-fixtures";

function deselectDownTo(
  draft: ReturnType<typeof openedDraft>,
  remaining: number,
): void {
  for (const id of draft.ids.slice(remaining)) {
    draft.store.getState().toggle(id);
  }
}

describe("new-match draft, who is listed", () => {
  it("RF-030 RF-068: a team with 12 active players lists and selects the 12, sorted, with no range warning in 6 periods", () => {
    const { store } = openedDraft(12);
    expect(listedNumbers(store)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
    ]);
    expect(selectedCount(store)).toBe(12);
    expect(store.getState().callUpRange).toBeNull();
  });

  it("RF-030: 12 active players and one deactivated list and select exactly the 12 active ones", () => {
    const draft = newDraft();
    const team = teamOf(draft.db);
    const ids = addSquad(draft.db, team.id, 13);
    deactivate(draft.db, ids[12] ?? -1);
    draft.store.getState().reset(team.id);
    const { store } = draft;
    expect(listedNumbers(store)).not.toContain("13");
    expect(listedNumbers(store)).toHaveLength(12);
    expect(selectedCount(store)).toBe(12);
    expect(store.getState().callUpRange).toBeNull();
  });

  it("RF-030: a deactivated player is not offered, so toggling it changes nothing", () => {
    const draft = newDraft();
    const team = teamOf(draft.db);
    const ids = addSquad(draft.db, team.id, 10);
    deactivate(draft.db, ids[9] ?? -1);
    draft.store.getState().reset(team.id);
    draft.store.getState().toggle(ids[9] ?? -1);
    expect(selectedCount(draft.store)).toBe(9);
    expect(listedNumbers(draft.store)).toHaveLength(9);
  });

  it("RF-030 E-020: players are listed sorted: Ana 0, Carla 0, Luis 00, Bea 7, Eva 10, and two with the same number are listed by name", () => {
    const draft = newDraft();
    const team = teamOf(draft.db);
    for (const [name, number] of [
      ["Luis", "00"],
      ["Eva", "10"],
      ["Carla", "0"],
      ["Bea", "7"],
      ["Ana", "0"],
    ] as const) {
      createPlayer(draft.db, { teamId: team.id, name, number });
    }
    draft.store.getState().reset(team.id);
    expect(
      draft.store
        .getState()
        .callUpSelection.map(
          (row) => `${row.player.name} ${row.player.number}`,
        ),
    ).toEqual(["Ana 0", "Carla 0", "Luis 00", "Bea 7", "Eva 10"]);
  });

  it("RF-030 RF-068 E-015: a team without players has an empty call-up and the range warning", () => {
    const { store } = openedDraft(0);
    expect(store.getState().callUpSelection).toEqual([]);
    expect(store.getState().callUpRange).not.toBeNull();
  });
});

describe("new-match draft, selecting", () => {
  it("RF-031 RF-068: toggle deselects and selects again, and the player stays in the list", () => {
    const { store, ids } = openedDraft(12);
    store.getState().toggle(ids[0] ?? -1);
    expect(selectedNumbers(store)).not.toContain("1");
    expect(listedNumbers(store)).toContain("1");
    store.getState().toggle(ids[0] ?? -1);
    expect(selectedCount(store)).toBe(12);
  });

  it("RF-031: toggle of a player that is not listed changes nothing", () => {
    const { store } = openedDraft(12);
    store.getState().toggle(9999);
    expect(selectedCount(store)).toBe(12);
    expect(listedNumbers(store)).toHaveLength(12);
  });

  it("RF-031: a player deselected in one draft is selected again after a reset, and the team keeps the player", () => {
    const { store, ids, team } = openedDraft(12);
    store.getState().toggle(ids[3] ?? -1);
    expect(selectedCount(store)).toBe(11);
    store.getState().reset(team.id);
    expect(selectedCount(store)).toBe(12);
    expect(listedNumbers(store)).toHaveLength(12);
  });
});

describe("new-match draft, the range of the format", () => {
  it.each([
    [12, false],
    [9, false],
    [8, true],
    [13, true],
  ])(
    "RF-068 E-015 E-030: with %i players selected in 6 periods the range warning is shown: %s",
    (count, warned) => {
      const draft = openedDraft(13);
      deselectDownTo(draft, count);
      expect(selectedCount(draft.store)).toBe(count);
      expect(draft.store.getState().callUpRange !== null).toBe(warned);
    },
  );

  it("RF-068 E-015: the warning names the format 6 and the 8 selected players", () => {
    const draft = openedDraft(12);
    deselectDownTo(draft, 8);
    expect(draft.store.getState().callUpRange).toMatchObject({
      format: 6,
      min: 9,
      max: 12,
      count: 8,
    });
  });

  it("RF-010 RF-068 E-030: with 13 active players the 13 are selected, the warning shows and nothing is blocked", () => {
    const { store, ids } = openedDraft(13);
    expect(selectedCount(store)).toBe(13);
    expect(store.getState().callUpRange).toMatchObject({ count: 13, max: 12 });
    store.getState().toggle(ids[0] ?? -1);
    expect(store.getState().callUpRange).toBeNull();
  });

  it("RF-010 RF-068 E-015: with 8 selected the warning stays, and the draft still accepts toggling and fields", () => {
    const draft = openedDraft(12);
    deselectDownTo(draft, 8);
    draft.store.getState().setHomeName("Local");
    draft.store.getState().toggle(draft.ids[11] ?? -1);
    expect(selectedCount(draft.store)).toBe(9);
    expect(draft.store.getState().callUpRange).toBeNull();
    draft.store.getState().toggle(draft.ids[11] ?? -1);
    expect(draft.store.getState().callUpRange).not.toBeNull();
  });

  it("RF-068 RF-084: with 8 selected in a 6-period team, setFormat(4) removes the warning (minimum 8) and setFormat(6) brings it back", () => {
    const draft = openedDraft(12, 6);
    deselectDownTo(draft, 8);
    expect(draft.store.getState().callUpRange).not.toBeNull();
    draft.store.getState().setFormat(4);
    expect(draft.store.getState().callUpRange).toBeNull();
    draft.store.getState().setFormat(6);
    expect(draft.store.getState().callUpRange).toMatchObject({
      format: 6,
      count: 8,
    });
  });

  it("RF-068 RF-084 E-024: setFormat(8) on a 6-period team with 8 selected shows no range warning (minimum 8)", () => {
    const draft = openedDraft(12, 6);
    deselectDownTo(draft, 8);
    draft.store.getState().setFormat(8);
    expect(draft.store.getState().callUpRange).toBeNull();
  });
});
