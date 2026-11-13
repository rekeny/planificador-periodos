import { getDatabase } from "@/data/database";
import { createNewMatchDraft } from "@/state/new-match-draft";
import { createSquadStore } from "@/state/squad-store";

let squadStore: ReturnType<typeof createSquadStore> | undefined;

/**
 * The one squad store of the app. It is built the first time it is asked for, never at import
 * time: modules load before the database is open and `getDatabase()` throws until then.
 */
export function getSquadStore(): ReturnType<typeof createSquadStore> {
  squadStore ??= createSquadStore(getDatabase());
  return squadStore;
}

let newMatchDraft: ReturnType<typeof createNewMatchDraft> | undefined;

/** The one new-match draft of the app, built on first use for the same reason as the squad store. */
export function getNewMatchDraft(): ReturnType<typeof createNewMatchDraft> {
  newMatchDraft ??= createNewMatchDraft(getDatabase(), () => new Date());
  return newMatchDraft;
}
