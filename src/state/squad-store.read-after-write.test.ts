// Codex F3 (BLOCKING): a squad action must not leave a committed write behind when the read that
// follows it fails. RF-085: the write either fully succeeds and is published, or it fails and
// nothing changed (database, published teams, open team), so one retry saves exactly one record.
// The reads fail through a real SQLite trigger plus a guard on `select` (tests/support/
// read-after-write.ts); the database is the real in-memory one.
import { listPlayers } from "@/data/player-repository";
import { listTeams } from "@/data/team-repository";
import { CONSISTENT, withRetry } from "../../tests/support/read-after-write";
import { judged, squadWith } from "../../tests/support/read-after-write-squad";
import { CADETE } from "../../tests/support/squad-fixtures";

describe("squad store, a read that fails after the write", () => {
  it("RF-013 RF-085: createTeam is either saved and published or saveFailed with no team stored", () => {
    const squad = squadWith([], [["teams", "INSERT"]]);
    const { outcome } = judged(squad, (s) => s.getState().createTeam(CADETE));
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-013 RF-085: a saveFailed createTeam stores no team, so the retry leaves exactly one", () => {
    const squad = squadWith([], [["teams", "INSERT"]]);
    const { last } = withRetry(squad.guard, () =>
      squad.store.getState().createTeam(CADETE),
    );
    expect(last).toEqual({ kind: "saved" });
    expect(listTeams(squad.raw).map((team) => team.name)).toEqual([
      CADETE.name,
    ]);
    expect(squad.store.getState().teams.map((team) => team.name)).toEqual([
      CADETE.name,
    ]);
  });

  it("RF-013 RF-085: createTeam next to a saved team is consistent, and once the reads work the next team adds exactly one", () => {
    const squad = squadWith(["Alevín A"], [["teams", "INSERT"]]);
    const { outcome } = judged(squad, (s) => s.getState().createTeam(CADETE));
    expect(CONSISTENT).toContain(outcome);
    squad.guard.heal();
    expect(
      squad.store.getState().createTeam({ ...CADETE, name: "Infantil C" }),
    ).toEqual({ kind: "saved" });
    const names = listTeams(squad.raw).map((team) => team.name);
    expect(names.filter((name) => name === "Alevín A")).toHaveLength(1);
    expect(names.filter((name) => name === CADETE.name).length).toBeLessThan(2);
    expect(names.filter((name) => name === "Infantil C")).toHaveLength(1);
  });

  it("RF-013 RF-085: updateTeam is either saved and published or saveFailed with the old name still stored", () => {
    const squad = squadWith(["Alevín A"], [["teams", "UPDATE"]]);
    const id = listTeams(squad.raw)[0]?.id ?? 0;
    const { outcome } = judged(squad, (s) =>
      s.getState().updateTeam(id, { ...CADETE, name: "Zaragoza" }),
    );
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-013 RF-085: after a saveFailed updateTeam nothing was stored, and the retry changes the team once", () => {
    const squad = squadWith(["Alevín A"], [["teams", "UPDATE"]]);
    const id = listTeams(squad.raw)[0]?.id ?? 0;
    const { last } = withRetry(squad.guard, () =>
      squad.store.getState().updateTeam(id, { ...CADETE, name: "Zaragoza" }),
    );
    expect(last).toEqual({ kind: "saved" });
    expect(listTeams(squad.raw).map((t) => [t.name, t.defaultFormat])).toEqual([
      ["Zaragoza", 8],
    ]);
    expect(squad.store.getState().team?.name).toBe("Zaragoza");
    expect(squad.store.getState().teams.map((t) => t.name)).toEqual([
      "Zaragoza",
    ]);
  });

  // addPlayer publishes from the saved record without reading again: it is already safe, and this
  // pins it so a later post-commit read cannot slip in.
  it("RF-016 RF-085: addPlayer publishes from the saved record and never reads after the write", () => {
    const squad = squadWith(["Alevín A"], [["players", "INSERT"]]);
    const { result, outcome } = judged(squad, (s) =>
      s.getState().addPlayer({ name: "Ana", number: "7" }),
    );
    expect(result).toEqual({ kind: "saved" });
    expect(outcome).toBe("published");
    const id = listTeams(squad.raw)[0]?.id ?? 0;
    expect(listPlayers(squad.raw, id)).toHaveLength(1);
  });
});
