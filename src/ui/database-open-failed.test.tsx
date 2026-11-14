// T087: DatabaseOpenFailed, the start-up message when the data cannot be opened (RF-085, RF-012).
// Props { retrying, onRetry }: the message `db.openFailed` and a «Reintentar» button (`db.retry`)
// that is disabled while `retrying`. `@/ui/database-open-failed` does not exist yet (missing module).
import { fireEvent, render, screen } from "@testing-library/react-native";

import es from "@/i18n/es.json";
import { DatabaseOpenFailed } from "@/ui/database-open-failed";
import { OPEN_FAILED, RETRY } from "../../tests/support/database-start-harness";

const retryButton = () => screen.getByRole("button", { name: RETRY });

function textsOnScreen(): unknown[] {
  return screen.queryAllByText(/.*/).map((node) => node.props.children);
}

describe("DatabaseOpenFailed", () => {
  it("RF-085 RF-012: es.json holds the two approved texts under db.openFailed and db.retry", () => {
    const texts = es as unknown as { db?: Record<string, string> };
    expect(texts.db?.openFailed).toBe(OPEN_FAILED);
    expect(texts.db?.retry).toBe(RETRY);
  });

  it("RF-085: it shows the message and a «Reintentar» button, found by role and text, and nothing else", async () => {
    await render(<DatabaseOpenFailed retrying={false} onRetry={jest.fn()} />);
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    expect(retryButton()).toBeOnTheScreen();
    expect(textsOnScreen()).toEqual([OPEN_FAILED, RETRY]);
  });

  it("RF-085: the button is enabled when nothing is retrying, and each press calls onRetry once", async () => {
    const onRetry = jest.fn();
    await render(<DatabaseOpenFailed retrying={false} onRetry={onRetry} />);
    expect(retryButton()).toBeEnabled();
    await fireEvent.press(retryButton());
    expect(onRetry).toHaveBeenCalledTimes(1);
    await fireEvent.press(retryButton());
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("RF-085: while retrying the message stays, the same button is disabled and a press does not call onRetry", async () => {
    const onRetry = jest.fn();
    await render(<DatabaseOpenFailed retrying={true} onRetry={onRetry} />);
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    expect(retryButton()).toBeDisabled();
    expect(retryButton().props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(retryButton());
    expect(onRetry).not.toHaveBeenCalled();
    expect(textsOnScreen()).toEqual([OPEN_FAILED, RETRY]);
  });

  it("RF-085: when retrying ends the button is enabled again and the texts are the same", async () => {
    const onRetry = jest.fn();
    const view = await render(
      <DatabaseOpenFailed retrying={true} onRetry={onRetry} />,
    );
    await view.rerender(
      <DatabaseOpenFailed retrying={false} onRetry={onRetry} />,
    );
    expect(retryButton()).toBeEnabled();
    await fireEvent.press(retryButton());
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(textsOnScreen()).toEqual([OPEN_FAILED, RETRY]);
  });
});
