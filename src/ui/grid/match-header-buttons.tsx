import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { ActionButton } from "./match-body-actions";
import { GridButtons } from "./grid-toolbar";
import type { GridButtonsProps } from "./grid-toolbar";

/** The native header's content: «Convocatoria», «Editar» and the three grid buttons (RF-076). */
export function MatchHeaderButtons({
  id,
  buttons,
}: {
  readonly id: number;
  readonly buttons: GridButtonsProps;
}): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.row}>
      <ActionButton
        label={t("callUp.title")}
        onPress={() => router.push(`/matches/${id}/call-up`)}
        inHeader
      />
      <ActionButton
        label={t("common.edit")}
        onPress={() => router.push(`/matches/${id}/edit`)}
        inHeader
      />
      <GridButtons {...buttons} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
