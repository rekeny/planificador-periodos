import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import type { SquadStore } from "@/state/squad-store";

/**
 * Opens team `id` in the shared squad store when the route is focused, and says when it has done it
 * (F-03). It is an effect, never a render: opening a team publishes a store update, and a render must
 * not update another component (the team screen stays mounted under its forms and reads the same
 * store). Until it is ready the route draws nothing, so a team left in the store by an earlier
 * screen is never shown and never receives a player.
 *
 * `"every-focus"` opens the team on every focus (the team screen: players created from a match show
 * on Back). `"if-another"` opens it on the first focus of the route, which reads the team afresh
 * (a team deleted since the last time is not shown), and later only when the store holds another
 * team (the forms: the store is shared by every mounted form, so after Back from another team's form
 * this route opens its own).
 */
export function useOpenRouteTeam(
  id: number | null,
  store: SquadStore,
  mode: "every-focus" | "if-another",
): boolean {
  const [ready, setReady] = useState(false);
  const opened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (id !== null) {
        const another = store.getState().team?.id !== id;
        if (mode === "every-focus" || another || !opened.current) {
          store.getState().openTeam(id);
        }
        opened.current = true;
      }
      setReady(true);
    }, [id, store, mode]),
  );
  return ready;
}
