import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

interface DuplicateNumberBannerProps {
  readonly numbers: readonly string[];
}

/** Informs only (RF-017, RF-069): it never blocks anything. Nothing is drawn without repeats. */
export function DuplicateNumberBanner({
  numbers,
}: DuplicateNumberBannerProps): ReactElement | null {
  const { t } = useTranslation();
  if (numbers.length === 0) return null;
  return (
    <Text style={styles.banner}>
      {t("warning.duplicateNumber", { numbers: numbers.join(", ") })}
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
