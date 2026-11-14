import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

interface RuleImpossibleBannerProps {
  readonly ruleImpossible: boolean;
  // A one-line chip on tablets, to save height (RF-081).
  readonly compact?: boolean;
}

/** The general warning above the grid (RF-067). It informs only: nothing is blocked. */
export function RuleImpossibleBanner({
  ruleImpossible,
  compact = false,
}: RuleImpossibleBannerProps): ReactElement | null {
  const { t } = useTranslation();
  if (!ruleImpossible) return null;
  return (
    <Text
      style={[styles.banner, compact && styles.chip]}
      numberOfLines={compact ? 1 : undefined}
    >
      {t("warning.ruleImpossible")}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fecaca",
    fontSize: 16,
  },
  chip: { marginVertical: 4, paddingVertical: 4, fontSize: 14, flexShrink: 1 },
});
