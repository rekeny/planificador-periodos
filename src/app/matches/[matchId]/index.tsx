import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useStore } from "zustand";

import { getMatchSessionStore } from "@/state/app-stores";
import type { MatchView } from "@/state/match-view";
import { parseMatchId } from "@/state/route-params";
import { buttonsInHeader } from "@/ui/grid/grid-layout";
import { GridButtons } from "@/ui/grid/grid-toolbar";
import { MatchGrid } from "@/ui/grid/match-grid";
import { useMatchActions } from "@/ui/grid/use-match-actions";
import { NotFound } from "@/ui/not-found";
import { SaveErrorBanner } from "@/ui/save-error-banner";
import { WarningStrip } from "@/ui/warnings/warning-strip";

function CallUpButton({
  id,
  inHeader,
}: {
  readonly id: number;
  readonly inHeader: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/matches/${id}/call-up`)}
      style={inHeader ? styles.headerAction : styles.action}
    >
      <Text style={inHeader ? styles.headerActionText : styles.actionText}>
        {t("callUp.title")}
      </Text>
    </Pressable>
  );
}

const heightOf = (event: LayoutChangeEvent): number =>
  event.nativeEvent.layout.height;

// The banners and the legend above the grid; their heights go to the grid's layout (T083).
function useWarningHeights(view: MatchView | null) {
  const [banners, setBanners] = useState(0);
  const [legend, setLegend] = useState(0);
  const hasBanners =
    view !== null && (view.ruleImpossible || view.callUpRange !== null);
  return {
    // A view that is gone reports no more heights, so they are zeroed here instead.
    bannersHeight: hasBanners ? banners : 0,
    legendHeight: view !== null && view.legend.length > 0 ? legend : 0,
    onBannersLayout: (event: LayoutChangeEvent) => setBanners(heightOf(event)),
    onLegendLayout: (event: LayoutChangeEvent) => setLegend(heightOf(event)),
  };
}

type Store = ReturnType<typeof getMatchSessionStore>;

// The session is opened on focus (not while rendering, which updates another screen's store). The
// screen stays mounted under another match route, which takes the session over, so it is
// opened again, but only when it is not already open for this match: coming back from
// the call-up or the new-player screen keeps the Undo history (RF-057, RF-058). Only popping this
// screen closes the session, and only when it still belongs to it (a not-found or another match's
// session is not this screen's to close).
function useOwnSession(id: number | null, store: Store): void {
  useFocusEffect(
    useCallback(() => {
      const { status, view, openMatch } = store.getState();
      const owned = status === "open" && view?.matchId === id;
      if (id !== null && !owned) openMatch(id);
    }, [id, store]),
  );
  useEffect(
    () => () => {
      const { status, view, closeMatch } = store.getState();
      if (status === "open" && view?.matchId === id) closeMatch();
    },
    [id, store],
  );
}

// The match screen: the grid with its buttons, the call-up entry and the warnings. It reads the
// session's view and calls its actions; the rules stay in the domain.
export default function MatchScreen(): ReactElement {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = parseMatchId(matchId);
  const store = getMatchSessionStore();
  useOwnSession(id, store);
  const status = useStore(store, (state) => state.status);
  const view = useStore(store, (state) => state.view);
  const saveFailed = useStore(store, (state) => state.saveFailed);
  const { buttons, dialog } = useMatchActions(view, () => store.getState());
  const heights = useWarningHeights(view);
  // Another match's view is never shown while the focus effect takes the session over.
  const showing =
    id !== null && status === "open" && view !== null && view.matchId === id;
  const inHeader = buttonsInHeader(width, height);

  // The header is native, so its buttons are set again whenever what they show changes.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        showing && inHeader
          ? () => (
              <View style={styles.headerRight}>
                <CallUpButton id={id} inHeader />
                <GridButtons {...buttons} />
              </View>
            )
          : undefined,
    });
  });

  if (!showing) return <NotFound />;

  return (
    <View style={styles.screen}>
      {inHeader ? null : <CallUpButton id={id} inHeader={false} />}
      <WarningStrip
        view={view}
        compact={inHeader}
        onBannersLayout={heights.onBannersLayout}
        onLegendLayout={heights.onLegendLayout}
      />
      <MatchGrid
        view={view}
        bannersHeight={heights.bannersHeight}
        legendHeight={heights.legendHeight}
        onTapCell={(cell) => void store.getState().tapCell(cell)}
      />
      {inHeader ? null : <GridButtons {...buttons} />}
      {dialog}
      {saveFailed ? <SaveErrorBanner floating /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  action: {
    alignItems: "center",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  actionText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerAction: { paddingHorizontal: 12, paddingVertical: 10 },
  headerActionText: { color: "#1d4ed8", fontSize: 16, fontWeight: "600" },
});
