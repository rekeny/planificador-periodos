// Spies of the keyboard tests of the forms inside a route (T072). This file holds no test calls. They
// are the helpers of tests/app/form-scroll.keyboard.test.tsx, which keeps its own private copies:
// Jest has no real keyboard, so a test gives the form a keyboard event and a focused field at a
// chosen height and reads the scroll the form asks for (RF-076, F-01, F-A1).
import { Keyboard, ScrollView, TextInput } from "react-native";
import type { KeyboardEvent } from "react-native";

export const KEYBOARD_TOP = 600;
export const KEYBOARD_MARGIN = 16;

type Handler = (event: KeyboardEvent) => void;

/** Records what the form listens to on `Keyboard`, so a test can send the event itself. */
export function recordKeyboard(): {
  show: (screenY?: number) => void;
  listening: () => string[];
  removed: jest.Mock;
} {
  const handlers = new Map<string, Handler>();
  const removed = jest.fn();
  jest.spyOn(Keyboard, "addListener").mockImplementation((name, handler) => {
    handlers.set(name, handler as Handler);
    return { remove: removed };
  });
  return {
    show: (screenY = KEYBOARD_TOP) => {
      handlers.get("keyboardDidShow")?.({
        endCoordinates: { screenY, screenX: 0, width: 1080, height: 400 },
      } as KeyboardEvent);
    },
    listening: () => [...handlers.keys()],
    removed,
  };
}

/** The scroll the form asks for. The ScrollView mock shares one `scrollTo` between tests, so it starts clean. */
export function watchScroll(): jest.SpyInstance {
  const spy = jest.spyOn(ScrollView.prototype, "scrollTo");
  spy.mockClear();
  return spy;
}

/** The field the coach is typing in, drawn from `top` down for `height` points. */
export function focusFieldAt(top: number, height = 50): void {
  jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
    measureInWindow: (
      done: (x: number, y: number, w: number, h: number) => void,
    ) => {
      done(0, top, 300, height);
    },
  } as never);
}
