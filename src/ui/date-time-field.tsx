import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { shownDate, shownTime } from "@/state/match-date-text";
import { DateTimeFieldAndroid } from "./date-time-field-android";
import { toLocalDate } from "./date-time-field-shared";
import type { DateTimeFieldProps } from "./date-time-field-shared";

// iOS keeps both pickers inline (they report nothing on mount); Android opens dialogs from buttons
// because its inline picker reports its initial value on mount (see date-time-field-android.tsx).
export function DateTimeField(props: DateTimeFieldProps): ReactElement {
  return Platform.OS === "android" ? (
    <DateTimeFieldAndroid {...props} />
  ) : (
    <DateTimeFieldInline {...props} />
  );
}

function DateTimeFieldInline({
  date,
  time,
  onDateChange,
  onTimeChange,
  onClearTime,
}: DateTimeFieldProps): ReactElement {
  const { t } = useTranslation();
  const timeText = shownTime(time);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t("match.field.date")}</Text>
      <Text>{shownDate(date)}</Text>
      <DateTimePicker
        mode="date"
        presentation="inline"
        locale="es-ES"
        value={toLocalDate(date, time)}
        onValueChange={(_event, picked) =>
          onDateChange({
            year: picked.getFullYear(),
            month: picked.getMonth() + 1,
            day: picked.getDate(),
          })
        }
      />
      <Text style={styles.label}>{t("match.field.time")}</Text>
      {timeText === null ? null : <Text>{timeText}</Text>}
      <DateTimePicker
        mode="time"
        presentation="inline"
        locale="es-ES"
        value={toLocalDate(date, time)}
        onValueChange={(_event, picked) =>
          onTimeChange({
            hour: picked.getHours(),
            minute: picked.getMinutes(),
          })
        }
      />
      <Pressable
        accessibilityRole="button"
        onPress={onClearTime}
        style={styles.clear}
      >
        <Text>{t("match.clearTime")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, marginTop: 8 },
  clear: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
  },
});
