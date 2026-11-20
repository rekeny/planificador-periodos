import type { ReactElement, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface FormScrollProps {
  readonly children: ReactNode;
  readonly contentStyle: StyleProp<ViewStyle>;
}

// Everything a form draws goes inside the scroll, so a short landscape viewport or an open keyboard
// never leaves a field, an error or «Guardar» out of reach. "handled" lets a tap on «Guardar» work
// while the keyboard is open.
//
// Room for the keyboard (F-01). On iOS the ScrollView adjusts its own insets, so the field being
// typed in stays above the keyboard wherever the screen sits. KeyboardAvoidingView is not used
// there: it guesses the overlap from its own position, which is wrong under a native header and
// inside a modal sheet, and with both the keyboard would be made room for twice. Android has no such
// prop, so it keeps KeyboardAvoidingView with "height".
export function FormScroll({
  children,
  contentStyle,
}: FormScrollProps): ReactElement {
  const ios = Platform.OS === "ios";
  return (
    <KeyboardAvoidingView
      testID="form-keyboard-avoiding"
      behavior={ios ? undefined : "height"}
      style={styles.avoiding}
    >
      <ScrollView
        testID="form-scroll"
        automaticallyAdjustKeyboardInsets={ios}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentStyle}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ avoiding: { flex: 1 } });
