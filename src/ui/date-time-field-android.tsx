import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shownDate, shownTime } from "@/state/match-date-text";
import { NoTime } from "./no-time";
import { ADDED_TIME, toLocalDate, toLocalTime } from "./date-time-field-shared";
import type { DateTimeFieldProps } from "./date-time-field-shared";

type Mode = "date" | "time";

interface DialogProps {
  readonly mode: Mode;
  readonly value: Date;
  readonly onPick: (picked: Date) => void;
  readonly onClose: () => void;
}

// The inline Android picker reports its initial value on mount, which would save an untouched
// 12:00, so the picker is a dialog the coach opens, and anything it reports while it is mounting
// is ignored: only a later emission (the confirm button) counts. A dialog never reports on mount;
// the guard is there in case a native version changes that.
function PickerDialog({
  mode,
  value,
  onPick,
  onClose,
}: DialogProps): ReactElement {
  const { t } = useTranslation();
  const armed = useRef(false);
  useEffect(() => {
    armed.current = true;
  }, []);
  return (
    <DateTimePicker
      mode={mode}
      presentation="dialog"
      positiveButton={{ label: t("common.accept") }}
      negativeButton={{ label: t("common.cancel") }}
      value={value}
      onValueChange={(_event, picked) => {
        if (!armed.current) return;
        onPick(picked);
        onClose();
      }}
      onDismiss={onClose}
    />
  );
}

interface TimePartProps {
  readonly time: string | null;
  readonly onAdd: () => void;
  readonly onOpen: () => void;
  readonly onClearTime: () => void;
}

// Derived from the props only: no time shows «Sin hora» and «Añadir hora»; a time shows its button.
function TimePart({
  time,
  onAdd,
  onOpen,
  onClearTime,
}: TimePartProps): ReactElement {
  const { t } = useTranslation();
  const timeText = shownTime(time);
  if (timeText === null) {
    return (
      <>
        <Text style={styles.label}>{t("match.field.time")}</Text>
        <NoTime onAdd={onAdd} />
      </>
    );
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.button}
      >
        <Text style={styles.label}>{t("match.field.time")}</Text>
        <Text>{timeText}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onClearTime()}
        style={styles.button}
      >
        <Text>{t("match.clearTime")}</Text>
      </Pressable>
    </>
  );
}

export function DateTimeFieldAndroid({
  date,
  time,
  onDateChange,
  onTimeChange,
  onClearTime,
}: DateTimeFieldProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Mode | null>(null);
  const close = (): void => setOpen(null);
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen("date")}
        style={styles.button}
      >
        <Text style={styles.label}>{t("match.field.date")}</Text>
        <Text>{shownDate(date)}</Text>
      </Pressable>
      <TimePart
        time={time}
        onAdd={() => {
          onTimeChange(ADDED_TIME);
          setOpen("time");
        }}
        onOpen={() => setOpen("time")}
        onClearTime={onClearTime}
      />
      {open === null ? null : (
        <PickerDialog
          mode={open}
          value={open === "time" ? toLocalTime(time) : toLocalDate(date, time)}
          onClose={close}
          onPick={(picked) =>
            open === "date"
              ? onDateChange({
                  year: picked.getFullYear(),
                  month: picked.getMonth() + 1,
                  day: picked.getDate(),
                })
              : onTimeChange({
                  hour: picked.getHours(),
                  minute: picked.getMinutes(),
                })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14 },
  button: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
    gap: 4,
  },
});
