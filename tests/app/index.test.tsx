import { render, screen } from "@testing-library/react-native";

import HomeScreen from "@/app/index";
import es from "@/i18n/es.json";
import "@/i18n";

describe("HomeScreen", () => {
  it("shows the app title from the Spanish texts file", async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole("header", { name: es.app.title })).toBeTruthy();
  });
});
