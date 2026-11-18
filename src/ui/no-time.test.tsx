// T089: NoTime, what the time field shows while the match has no time (RF-083). Props { onAdd }:
// the text «Sin hora» (match.noTime) and a button «Añadir hora» (match.addTime) that calls onAdd.
// `@/ui/no-time` does not exist yet (missing module).
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { NoTime } from "@/ui/no-time";

const addButton = () => screen.getByRole("button", { name: "Añadir hora" });

describe("NoTime", () => {
  it("RF-083: NoTime shows «Sin hora» and a button «Añadir hora», and nothing else", async () => {
    await render(<NoTime onAdd={jest.fn()} />);
    expect(screen.getByText("Sin hora")).toBeOnTheScreen();
    expect(addButton()).toBeOnTheScreen();
    const texts = screen
      .queryAllByText(/.*/)
      .map((node) => node.props.children);
    expect(texts).toEqual(["Sin hora", "Añadir hora"]);
  });

  it("RF-083: each press of «Añadir hora» calls onAdd once, and rendering calls it never", async () => {
    const onAdd = jest.fn();
    await render(<NoTime onAdd={onAdd} />);
    expect(onAdd).toHaveBeenCalledTimes(0);
    await fireEvent.press(addButton());
    expect(onAdd).toHaveBeenCalledTimes(1);
    await fireEvent.press(addButton());
    expect(onAdd).toHaveBeenCalledTimes(2);
  });
});
