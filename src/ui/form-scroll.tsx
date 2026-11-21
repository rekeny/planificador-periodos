import { useEffect, useRef } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
  StyleProp,
  ViewStyle,
} from "react-native";

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
// inside a modal sheet, and with both the keyboard would be made room for twice.
//
// Android (F-A1) has no such prop and the window does not resize (the app is edge to edge). The
// KeyboardAvoidingView with "height" shrinks the visible area, but the field that was tapped was in
// view before the keyboard opened and nothing scrolled it again, so it stayed under the keyboard.
// Once the keyboard has shown, the form scrolls the focused field to just above it.
const KEYBOARD_MARGIN = 16;

function useScrollToFocusedField(): {
  scrollRef: RefObject<ScrollViewInstance | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }
    const subscription = Keyboard.addListener("keyboardDidShow", (event) => {
      TextInput.State.currentlyFocusedInput()?.measureInWindow(
        (_x, y, _width, height) => {
          const hidden =
            y + height + KEYBOARD_MARGIN - event.endCoordinates.screenY;
          if (hidden > 0) {
            scrollRef.current?.scrollTo({
              y: offset.current + hidden,
              animated: true,
            });
          }
        },
      );
    });
    return () => {
      subscription.remove();
    };
  }, []);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    offset.current = event.nativeEvent.contentOffset.y;
  };
  return { scrollRef, onScroll };
}

export function FormScroll({
  children,
  contentStyle,
}: FormScrollProps): ReactElement {
  const ios = Platform.OS === "ios";
  const { scrollRef, onScroll } = useScrollToFocusedField();
  return (
    <KeyboardAvoidingView
      testID="form-keyboard-avoiding"
      behavior={ios ? undefined : "height"}
      style={styles.avoiding}
    >
      <ScrollView
        ref={scrollRef}
        testID="form-scroll"
        onScroll={onScroll}
        scrollEventThrottle={16}
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
