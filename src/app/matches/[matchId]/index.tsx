import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
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

// The match screen: the grid with its buttons, the call-up entry and the warnings. It reads the
// session's view and calls its actions; the rules stay in the domain.
export default function MatchScreen(): ReactElement {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const id = parseMatchId(matchId);
  const store = getMatchSessionStore();
  // Opened once, before the first render reads the store, so another match's data is never shown.
  useState(() => {
    if (id !== null) store.getState().openMatch(id);
  });
  // Only popping this screen closes the session: the call-up screen is pushed on top of it and
  // this one stays mounted below (RF-057). Focus events are not used for that reason.
  useEffect(() => () => store.getState().closeMatch(), [store]);
  const status = useStore(store, (state) => state.status);
  const view = useStore(store, (state) => state.view);
  const saveFailed = useStore(store, (state) => state.saveFailed);
  const { buttons, dialog } = useMatchActions(view, () => store.getState());
  const heights = useWarningHeights(view);
  const showing = id !== null && status === "open" && view !== null;
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
      {saveFailed ? <SaveErrorBanner /> : null}
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
