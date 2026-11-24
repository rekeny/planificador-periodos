// T075: what editing, deactivating and reactivating a player does to matches (RF-019, RF-023,
// RF-024, E-018). The squad store, the match session and the new-match draft share one real
// in-memory database, as the app shares one file. Nothing is mocked.
import type { AppDatabase } from "@/data/database-types";
import { createNewMatchDraft } from "@/state/new-match-draft";
import { createSquadStore } from "@/state/squad-store";
import {
  rowLabels,
  writeMark,
} from "../../tests/support/match-session-fixtures";
import {
  savedCallUp,
  sessionWithBench,
} from "../../tests/support/match-session-call-up";
import {
  clockAt,
  listedNumbers,
  savedEntryLabels,
  selectedNumbers,
} from "../../tests/support/new-match-fixtures";

function squadOn(db: AppDatabase, teamId: number) {
  const store = createSquadStore(db);
  store.getState().openTeam(teamId);
  return store;
}

function idOf(store: ReturnType<typeof squadOn>, name: string): number {
  const found = store.getState().players.find((p) => p.name === name);
  if (found === undefined) {
    throw new Error(`The open team has no player named ${name}`);
  }
  return found.id;
}

function draftOn(db: AppDatabase, teamId: number) {
  const draft = createNewMatchDraft(db, clockAt(2026, 11, 11).read);
  expect(draft.getState().reset(teamId)).toBe(true);
  return draft;
}

describe("squad store, an edited player and the matches", () => {
  it("RF-019 E-018: Juan 7 changed to 9 and then added to a match created before the change shows 9 in that match and in its saved call-up", () => {
    const { db, teamId, matchId, store, benched } = sessionWithBench(
      [
        ["Ana", "8"],
        ["Eva", "10"],
      ],
      [["Juan", "7"]],
    );
    const squad = squadOn(db, teamId);
    const juan = benched[0]?.id ?? 0;
    expect(
      squad.getState().updatePlayer(juan, { name: "Juan", number: "9" }),
    ).toEqual({ kind: "saved" });
    store.getState().openMatch(matchId);
    expect(store.getState().addToCallUp(juan)).toEqual({ kind: "saved" });
    expect(rowLabels(store)).toContain("9 Juan");
    expect(rowLabels(store)).not.toContain("7 Juan");
    expect(savedCallUp(db, matchId)).toContain("9 Juan");
  });

  it("RF-019 E-018: a match whose call-up already had Juan 7 still shows 7 after the change, and a new match shows 9", () => {
    const { db, teamId, matchId, store } = sessionWithBench(
      [
        ["Juan", "7"],
        ["Ana", "8"],
      ],
      [],
    );
    const squad = squadOn(db, teamId);
    squad
      .getState()
      .updatePlayer(idOf(squad, "Juan"), { name: "Juan Pérez", number: "9" });
    store.getState().openMatch(matchId);
    expect(rowLabels(store)).toEqual(["7 Juan", "8 Ana"]);
    expect(savedCallUp(db, matchId)).toEqual(["7 Juan", "8 Ana"]);
    const draft = draftOn(db, teamId);
    const created = draft.getState().create();
    expect(created.kind).toBe("saved");
    expect(savedEntryLabels(db, created.matchId ?? 0)).toEqual([
      "8 Ana",
      "9 Juan Pérez",
    ]);
    expect(savedEntryLabels(db, matchId)).toEqual(["7 Juan", "8 Ana"]);
  });
});

describe("squad store, a deactivated player and the matches", () => {
  it("RF-023: the match session does not offer a deactivated player to add, and keeps offering the active ones", () => {
    const { db, teamId, matchId, store, benched } = sessionWithBench(
      [["Eva", "10"]],
      [
        ["Ana", "3"],
        ["Carla", "5"],
      ],
    );
    const squad = squadOn(db, teamId);
    squad.getState().setPlayerActive(benched[0]?.id ?? 0, false);
    store.getState().openMatch(matchId);
    expect(store.getState().view?.playersToAdd.map((p) => p.name)).toEqual([
      "Carla",
    ]);
  });

  it("RF-023 RF-024: a player deactivated and reactivated before the match is opened is offered again", () => {
    const { db, teamId, matchId, store, benched } = sessionWithBench(
      [["Eva", "10"]],
      [["Ana", "3"]],
    );
    const squad = squadOn(db, teamId);
    const ana = benched[0]?.id ?? 0;
    squad.getState().setPlayerActive(ana, false);
    squad.getState().setPlayerActive(ana, true);
    store.getState().openMatch(matchId);
    expect(store.getState().view?.playersToAdd.map((p) => p.name)).toEqual([
      "Ana",
    ]);
  });

  it("RF-023: the next new-match draft lists and selects only the active players, so a deactivated Ana is not in it", () => {
    const { db, teamId } = sessionWithBench(
      [
        ["Juan", "7"],
        ["Ana", "8"],
        ["Eva", "10"],
      ],
      [],
    );
    const squad = squadOn(db, teamId);
    squad.getState().setPlayerActive(idOf(squad, "Ana"), false);
    const draft = draftOn(db, teamId);
    expect(listedNumbers(draft)).toEqual(["7", "10"]);
    expect(selectedNumbers(draft)).toEqual(["7", "10"]);
    const created = draft.getState().create();
    expect(savedEntryLabels(db, created.matchId ?? 0)).toEqual([
      "10 Eva",
      "7 Juan",
    ]);
  });

  it("RF-024: reactivating Ana asks nothing and the next new-match draft includes her, selected", () => {
    const { db, teamId } = sessionWithBench(
      [
        ["Juan", "7"],
        ["Ana", "8"],
      ],
      [],
    );
    const squad = squadOn(db, teamId);
    const ana = idOf(squad, "Ana");
    squad.getState().setPlayerActive(ana, false);
    expect(listedNumbers(draftOn(db, teamId))).toEqual(["7"]);
    expect(squad.getState().setPlayerActive(ana, true)).toEqual({
      kind: "saved",
    });
    const draft = draftOn(db, teamId);
    expect(listedNumbers(draft)).toEqual(["7", "8"]);
    expect(selectedNumbers(draft)).toEqual(["7", "8"]);
  });

  it("RF-023: a deactivated player stays in the match saved before, with her marks, and is not offered to add", () => {
    const { db, teamId, matchId, store, entryIds } = sessionWithBench(
      [
        ["Juan", "7"],
        ["Ana", "8"],
      ],
      [["Carla", "5"]],
    );
    writeMark(db, entryIds[1] ?? 0, "P", 1, "starter");
    writeMark(db, entryIds[1] ?? 0, "P", 2, "sub");
    const squad = squadOn(db, teamId);
    squad.getState().setPlayerActive(idOf(squad, "Ana"), false);
    store.getState().openMatch(matchId);
    const rows = store.getState().view?.rows ?? [];
    expect(rows.map((r) => `${r.number} ${r.name}`)).toEqual([
      "7 Juan",
      "8 Ana",
    ]);
    expect(rows.find((r) => r.name === "Ana")?.hasMarks).toBe(true);
    expect(store.getState().view?.playersToAdd.map((p) => p.name)).toEqual([
      "Carla",
    ]);
  });
});
