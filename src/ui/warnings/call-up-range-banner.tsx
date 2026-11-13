import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

import type { MatchView } from "@/state/match-view";

interface CallUpRangeBannerProps {
  readonly warning: MatchView["callUpRange"];
}

/** Informs only (RF-068): the call-up is never refused. Nothing is drawn inside the range. */
export function CallUpRangeBanner({
  warning,
}: CallUpRangeBannerProps): ReactElement | null {
  const { t } = useTranslation();
  if (warning === null) return null;
  return (
    <Text style={styles.banner}>
      {t("warning.callUpRange", {
        format: warning.format,
        min: warning.min,
        count: warning.count,
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fde68a",
    fontSize: 16,
  },
});
