// The keyboard rules of the US7 flow (T078), found on the runs of T073 and T066: a single-line field is
// closed with `pressKey: Enter` and then the close-keyboard subflow, before the next field is tapped;
// the number pad has no Enter, so its label is tapped and the subflow closes it. `hideKeyboard` is
// never used (on Android, with the keyboard closed, it acts as Back).
import { CLOSE_KEYBOARD, ENTER, present, texts7 } from "../support/us7-flow";

const typedAt = (all: string[]): number[] =>
  all.flatMap((line, index) =>
    line.startsWith("- inputText:") ? [index] : [],
  );
const isNumber = (line: string): boolean => /^- inputText: "\d+"$/.test(line);

describe("T078 Maestro US7 keyboard", () => {
  it("RF-018: every text typed in a single-line field is followed by Enter and the close-keyboard subflow", () => {
    expect(present()).toBe(true);
    const all = texts7();
    const texts = typedAt(all).filter((index) => !isNumber(all[index] ?? ""));
    expect(texts.length).toBeGreaterThan(8);
    const wrong = texts.filter(
      (index) => all[index + 1] !== ENTER || all[index + 2] !== CLOSE_KEYBOARD,
    );
    expect(wrong.map((index) => all[index])).toEqual([]);
  });

  it("RF-018: every number typed (a dorsal) is followed, in the next two commands, by the close-keyboard subflow", () => {
    expect(present()).toBe(true);
    const all = texts7();
    const numbers = typedAt(all).filter((index) => isNumber(all[index] ?? ""));
    expect(numbers.length).toBeGreaterThan(4);
    const wrong = numbers.filter(
      (index) => !all.slice(index + 1, index + 3).includes(CLOSE_KEYBOARD),
    );
    expect(wrong.map((index) => all[index])).toEqual([]);
  });

  it("RF-018: the dorsal of the edit is erased before the new one is typed: eraseText comes right after the tap on the field and before the 9", () => {
    expect(present()).toBe(true);
    const all = texts7();
    const nine = all.indexOf('- inputText: "9"');
    expect(nine).toBeGreaterThan(1);
    expect(all[nine - 1]).toMatch(/^- eraseText/);
    expect(all[nine - 2]).toMatch(/text: "Dorsal"|^- tapOn: "Dorsal"$/);
  });
});
