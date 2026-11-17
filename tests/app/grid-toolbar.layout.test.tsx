// Fifth Codex review, finding 3 (RF-076, RF-055, RF-058, RF-059): with an overtime the three phone
// toolbar buttons («Deshacer», «Añadir prórroga», «Quitar prórroga») were about 400 pt wide in a
// row, past the 375 pt reference phone. Jest has no layout, so the tests pin what makes the row
// fit by construction: the row wraps onto a second line, every button keeps a 44 pt touch target,
// no button has a fixed width above a third of the room, and a label never grows past one line
// without shrinking. Same structure at 320 pt, a narrower phone. The component is rendered alone.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { GridButtons } from "@/ui/grid/grid-toolbar";
import { restoreWindow, setWindow } from "../support/window-size";

const NAMES = ["Deshacer", "Añadir prórroga", "Quitar prórroga"];
const MIN_TOUCH = 44;
// The room a screen leaves to the row: the window less 16 pt of margin on each side.
const MARGIN = 16;

type Node = ReturnType<typeof screen.getByRole>;
type Style = Record<string, unknown>;

afterEach(async () => restoreWindow());

async function renderToolbar(width: number): Promise<void> {
  await setWindow(width, 667);
  await render(
    <GridButtons
      canUndo
      canRemoveOvertime
      onUndo={jest.fn()}
      onAddOvertime={jest.fn()}
      onRemoveOvertime={jest.fn()}
    />,
  );
}

function buttons(): Node[] {
  return NAMES.map((name) => screen.getByRole("button", { name }));
}

function styleOf(node: Node): Style {
  return (StyleSheet.flatten(node.props.style) ?? {}) as Style;
}

/** The host View that holds the three buttons: the parent of the first button's host. */
function row(): Node {
  let node = buttons()[0]?.parent ?? null;
  while (node !== null && typeof node.type !== "string") node = node.parent;
  if (node === null) throw new Error("The buttons have no host parent");
  return node;
}

describe("grid toolbar, three buttons on a phone", () => {
  it.each([320, 375])(
    "RF-076 RF-058 RF-059: in a %s pt window the row of three buttons wraps onto a second line instead of overflowing",
    async (width) => {
      await renderToolbar(width);
      expect(styleOf(row())).toMatchObject({
        flexDirection: "row",
        flexWrap: "wrap",
      });
    },
  );

  it.each([320, 375])(
    "RF-076 RF-055: in a %s pt window no button has a fixed width above a third of the room and each keeps a 44 pt touch target",
    async (width) => {
      await renderToolbar(width);
      const third = (width - 2 * MARGIN) / 3;
      for (const button of buttons()) {
        const style = styleOf(button);
        expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
        for (const key of ["width", "minWidth"]) {
          const fixed = style[key];
          if (typeof fixed === "number") {
            expect(fixed).toBeLessThanOrEqual(third);
          }
        }
      }
    },
  );

  it("RF-076 RF-058 RF-059: every label is one bounded line that shrinks or is cut, never a row-widening Text", async () => {
    await renderToolbar(375);
    for (const name of NAMES) {
      const label = screen.getByText(name);
      const bounded =
        label.props.numberOfLines !== undefined ||
        label.props.adjustsFontSizeToFit === true;
      expect({ name, bounded }).toEqual({ name, bounded: true });
    }
  });
});
