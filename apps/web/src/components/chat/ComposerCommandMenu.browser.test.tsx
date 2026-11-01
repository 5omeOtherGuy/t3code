import { useState } from "react";
import { describe, expect, it, onTestFinished, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import "~/index.css";

import { render } from "../../../test/render";
import { ComposerCommandMenu, type ComposerCommandItem } from "./ComposerCommandMenu";
import { resolveComposerMenuActiveItemId } from "./composerMenuHighlight";

const ITEM_COUNT = 200;
const ITEMS: ComposerCommandItem[] = Array.from({ length: ITEM_COUNT }, (_, index) => ({
  id: `slash:${index}`,
  type: "slash-command",
  command: "model",
  label: `/command-${index}`,
  description: `Command number ${index}`,
}));

function Menu(props: { readonly onSelect: (item: ComposerCommandItem) => void }) {
  const [items, setItems] = useState(ITEMS);
  const [searchKey, setSearchKey] = useState("all");
  const [highlight, setHighlight] = useState<{
    readonly itemId: string | null;
    readonly searchKey: string | null;
  }>({ itemId: null, searchKey: null });
  return (
    <>
      <button
        type="button"
        onClick={() => setHighlight({ itemId: ITEMS[ITEM_COUNT - 1]!.id, searchKey })}
      >
        Highlight last
      </button>
      <button type="button" onClick={() => setItems(ITEMS.toReversed())}>
        Reverse results
      </button>
      <button
        type="button"
        onClick={() => {
          setItems(ITEMS.slice(50));
          setSearchKey("filtered");
        }}
      >
        Filter results
      </button>
      <button type="button" onClick={() => setItems([])}>
        Clear results
      </button>
      <button type="button" onClick={() => setItems(ITEMS)}>
        Restore results
      </button>
      <ComposerCommandMenu
        listId="menu"
        items={items}
        resolvedTheme="light"
        isLoading={false}
        triggerKind="slash-command"
        activeItemId={resolveComposerMenuActiveItemId({
          items,
          highlightedItemId: highlight.itemId,
          currentSearchKey: searchKey,
          highlightedSearchKey: highlight.searchKey,
        })}
        onHighlightedItemChange={(itemId) => setHighlight({ itemId, searchKey })}
        onSelect={props.onSelect}
      />
    </>
  );
}

const renderedRows = () => document.querySelectorAll("[data-composer-item-id]");
const listScroller = (row: Element | null | undefined) =>
  row?.closest("[data-slot=scroll-area-viewport]");

describe("ComposerCommandMenu", () => {
  it("mounts only the rows near the viewport and reaches a far row when it is highlighted", async () => {
    const onSelect = vi.fn();
    await using screen = await render(<Menu onSelect={onSelect} />);

    await expect.element(screen.getByText("/command-0")).toBeVisible();
    expect(renderedRows().length).toBeLessThan(ITEM_COUNT / 4);
    const rowHeight = renderedRows()[0]!.getBoundingClientRect().height;
    const scrollHeight = listScroller(renderedRows()[0])!.scrollHeight;
    expect(scrollHeight).toBeGreaterThanOrEqual(ITEM_COUNT * rowHeight);
    expect(scrollHeight).toBeLessThanOrEqual(ITEM_COUNT * rowHeight + 16);

    await userEvent.click(screen.getByRole("button", { name: "Highlight last" }));

    await expect.element(screen.getByText("/command-199")).toBeVisible();
    expect(renderedRows().length).toBeLessThan(ITEM_COUNT / 4);
    await vi.waitFor(() => {
      const row = screen.getByText("/command-199").element().closest("[data-composer-item-id]");
      expect(row!.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        listScroller(row)!.getBoundingClientRect().bottom,
      );
    });

    const lastOption = screen.getByRole("option", { name: /command-199/u });
    await expect.element(lastOption).toHaveAttribute("aria-posinset", String(ITEM_COUNT));
    await expect.element(lastOption).toHaveAttribute("aria-setsize", String(ITEM_COUNT));

    await userEvent.click(screen.getByText("/command-199"));
    expect(onSelect).toHaveBeenCalledWith(ITEMS[ITEM_COUNT - 1]);
  });

  it("reveals a new first result after the list was scrolled away from it", async () => {
    await using screen = await render(<Menu onSelect={() => undefined} />);

    const firstRow = screen.getByText("/command-0");
    await expect.element(firstRow).toBeVisible();
    listScroller(firstRow.element())!.scrollTop = 3_000;
    await expect.element(screen.getByText("/command-95")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reverse results" }));

    await expect.element(screen.getByText("/command-199")).toBeVisible();
  });

  it("mounts rows for pointer scrolling only once the pointer reaches the list", async () => {
    await using screen = await render(<Menu onSelect={() => undefined} />);

    await expect.element(screen.getByText("/command-0")).toBeVisible();
    const rowsBeforePointer = renderedRows().length;

    await userEvent.hover(screen.getByText("/command-1"));

    await vi.waitFor(() => expect(renderedRows().length).toBeGreaterThan(rowsBeforePointer));
  });

  it("mounts every visible row at the largest interface font size", async () => {
    document.documentElement.style.fontSize = "20px";
    onTestFinished(() => {
      document.documentElement.style.fontSize = "";
    });
    await using screen = await render(<Menu onSelect={() => undefined} />);

    const viewport = listScroller(screen.getByText("/command-0").element())!;
    viewport.scrollTop = 959;

    await vi.waitFor(() => {
      const lastRow = renderedRows()[renderedRows().length - 1]!;
      expect(lastRow.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
        viewport.getBoundingClientRect().bottom,
      );
    });
  });

  it("keeps a new search on its first result after a row was hovered", async () => {
    await using screen = await render(<Menu onSelect={() => undefined} />);

    await userEvent.hover(screen.getByText("/command-5"));
    await expect
      .element(screen.getByRole("option", { name: /command-5 /u }))
      .toHaveAttribute("aria-selected", "true");

    (screen.getByRole("button", { name: "Filter results" }).element() as HTMLElement).click();

    await expect
      .element(screen.getByRole("option", { name: /command-50 /u }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("starts from the top again when results return after an empty list", async () => {
    await using screen = await render(<Menu onSelect={() => undefined} />);

    const firstRow = screen.getByText("/command-0");
    await expect.element(firstRow).toBeVisible();
    listScroller(firstRow.element())!.scrollTop = 3_000;
    await expect.element(screen.getByText("/command-95")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear results" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore results" }));

    await expect.element(screen.getByText("/command-3")).toBeVisible();
  });
});
