import { getDatabase } from "@/data/database";
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
