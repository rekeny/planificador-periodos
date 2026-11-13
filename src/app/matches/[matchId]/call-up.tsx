import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useStore } from "zustand";

import { getMatchSessionStore } from "@/state/app-stores";
import type { RowView } from "@/state/match-view";
import { parseMatchId } from "@/state/route-params";
import { CallUpRows, PlayersToAdd } from "@/ui/call-up-lists";
import { ChoiceDialog } from "@/ui/choice-dialog";
import { NotFound } from "@/ui/not-found";
import { SaveErrorBanner } from "@/ui/save-error-banner";
import { CallUpRangeBanner } from "@/ui/warnings/call-up-range-banner";

// Pushed on top of the match screen, which keeps the session open: this screen never opens or
// closes it, so a route whose session is not open for its match shows the not-found message.
export default function CallUpScreen(): ReactElement {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = parseMatchId(matchId);
  const store = getMatchSessionStore();
  const status = useStore(store, (state) => state.status);
  const view = useStore(store, (state) => state.view);
  const saveFailed = useStore(store, (state) => state.saveFailed);
  const [asking, setAsking] = useState<RowView | null>(null);

  if (id === null || status !== "open" || view === null || view.matchId !== id)
    return <NotFound />;

  const remove = (row: RowView): void => {
    if (row.hasMarks) setAsking(row);
    else store.getState().removeFromCallUp(row.entryId);
  };
  const confirmRemoval = (): void => {
    if (asking !== null) store.getState().removeFromCallUp(asking.entryId);
    setAsking(null);
  };

  return (
    <View style={styles.screen}>
      <ScrollView>
        <CallUpRangeBanner warning={view.callUpRange} />
        <CallUpRows rows={view.rows} onRemove={remove} />
        <PlayersToAdd
          players={view.playersToAdd}
          onAdd={(playerId) => store.getState().addToCallUp(playerId)}
        />
      </ScrollView>
      <ChoiceDialog
        mode="confirm"
        visible={asking !== null}
        title={t("confirm.removeFromCallUp.title", { name: asking?.name })}
        message={t("confirm.removeFromCallUp.message")}
        confirmLabel={t("confirm.removeFromCallUp.confirm")}
        onConfirm={confirmRemoval}
        onCancel={() => setAsking(null)}
      />
      {saveFailed ? <SaveErrorBanner /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
