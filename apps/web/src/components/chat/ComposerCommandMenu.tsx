import { formatProviderSkillDisplayName } from "@t3tools/shared/inlineSkills";
import type { ComposerPathSearchTarget } from "@t3tools/client-runtime/state/threads";
import {
  resolveProviderSkillSourceKind,
  type ProviderSkillSourceKind,
} from "@t3tools/client-runtime/providerSkills";
import {
  type EnvironmentId,
  type EnvironmentMachineKind,
  type ProjectEntry,
  type ProviderDriverKind,
  type PullRequestContextMetadata,
  type ScopedThreadRef,
  type ServerProviderSkill,
  type ServerProviderSlashCommand,
} from "@t3tools/contracts";
import {
  BlocksIcon,
  FolderIcon,
  MessagesSquareIcon,
  PackageIcon,
  SettingsIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { memo, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { type ComposerSlashCommand, type ComposerTriggerKind } from "../../composer-logic";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import { PierreEntryIcon } from "./PierreEntryIcon";
import { ComposerBanner } from "./ComposerBanner";
import { resolvePullRequestState } from "../pullRequest/pullRequestPresentation";

export type ComposerCommandItem =
  | {
      id: string;
      type: "path";
      path: string;
      pathKind: ProjectEntry["kind"];
      searchTarget: ComposerPathSearchTarget;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "slash-command";
      command: ComposerSlashCommand;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "provider-slash-command";
      provider: ProviderDriverKind;
      command: ServerProviderSlashCommand;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "skill";
      provider: ProviderDriverKind;
      skill: ServerProviderSkill;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "pull-request";
      pullRequest: PullRequestContextMetadata;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "thread";
      thread: ScopedThreadRef;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "environment";
      environmentId: EnvironmentId;
      machine: EnvironmentMachineKind;
      label: string;
      description: string;
    };

// The rem height of CommandList's max-h-72.
const LIST_MAX_HEIGHT_REM = 18;
const SCROLL_STEP_PX = 60;
// Keyboard scrolling flushes rows in the frame it moves, so it needs only the list padding.
const KEYBOARD_OVERSCAN_PX = 30;
// Wheel, touch and scrollbar scrolling can paint on the compositor before rows mount.
const POINTER_OVERSCAN_PX = 240;
const ROW_SLOTS = 64;

type RowKind = "plain" | "badged";
const DEFAULT_ROW_HEIGHTS: Record<RowKind, number> = { plain: 28, badged: 30 };

const rowKindOf = (item: ComposerCommandItem): RowKind =>
  item.type === "skill" ? "badged" : "plain";

export const ComposerCommandMenu = memo(function ComposerCommandMenu(props: {
  listId: string;
  items: ComposerCommandItem[];
  resolvedTheme: "light" | "dark";
  isLoading: boolean;
  triggerKind: ComposerTriggerKind | null;
  emptyStateText?: string;
  activeItemId: string | null;
  onHighlightedItemChange: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- scrolls the highlighted menu item's DOM node into view
  useLayoutEffect(() => {
    if (!props.activeItemId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-composer-item-id="${CSS.escape(props.activeItemId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [props.activeItemId]);

  return (
    <Command
      autoHighlight={false}
      mode="none"
      onItemHighlighted={(highlightedValue) => {
        props.onHighlightedItemChange(
          typeof highlightedValue === "string" ? highlightedValue : null,
        );
      }}
    >
      <ComposerBanner.Surface
        ref={listRef}
        className="flex min-h-0 w-full flex-col overflow-hidden pb-(--chat-composer-attachment-overlap) **:data-[slot=command-item]:rounded-lg **:data-[slot=scroll-area-scrollbar]:data-[orientation=vertical]:my-4"
        data-composer-command-drawer="true"
      >
        {props.items.length > 0 ? (
          <CommandList
            id={props.listId}
            aria-label={props.triggerKind ? LISTBOX_LABEL_BY_TRIGGER[props.triggerKind] : undefined}
            className="max-h-72 min-h-0 scroll-pb-6"
          >
            <ComposerCommandMenuRows
              listId={props.listId}
              items={props.items}
              resolvedTheme={props.resolvedTheme}
              triggerKind={props.triggerKind}
              activeItemId={props.activeItemId}
              onHighlightedItemChange={props.onHighlightedItemChange}
              onSelect={props.onSelect}
            />
          </CommandList>
        ) : (
          <div className="px-5 pt-3.5 pb-7">
            <p className="text-secondary-label text-xs">
              {props.isLoading
                ? props.triggerKind === "skill"
                  ? "Searching workspace skills..."
                  : props.triggerKind === "pull-request"
                    ? "Finding pull request..."
                    : "Searching workspace files..."
                : (props.emptyStateText ??
                  (props.triggerKind === "skill"
                    ? "No skills found. Try / to browse provider commands."
                    : props.triggerKind === "path"
                      ? "No matching files or folders."
                      : "No matching command."))}
            </p>
          </div>
        )}
      </ComposerBanner.Surface>
    </Command>
  );
});

function ComposerCommandMenuRows(props: {
  listId: string;
  items: ComposerCommandItem[];
  resolvedTheme: "light" | "dark";
  triggerKind: ComposerTriggerKind | null;
  activeItemId: string | null;
  onHighlightedItemChange: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [scrollStep, setScrollStep] = useState(0);
  const [pointerOverList, setPointerOverList] = useState(false);
  const [rowHeights, setRowHeights] = useState(DEFAULT_ROW_HEIGHTS);
  const [viewportHeight] = useState(
    () =>
      LIST_MAX_HEIGHT_REM *
      (Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16),
  );

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- subscribes to the ScrollArea viewport, and flushes so rows are mounted in the frame that scrolls to them
  useLayoutEffect(() => {
    const viewport = groupRef.current?.closest("[data-slot=scroll-area-viewport]");
    const scrollArea = viewport?.parentElement;
    if (!viewport || !scrollArea) return;
    const onScroll = () => {
      flushSync(() => setScrollStep(Math.floor(viewport.scrollTop / SCROLL_STEP_PX)));
    };
    const onPointerEnter = () => setPointerOverList(true);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    scrollArea.addEventListener("pointerenter", onPointerEnter, { once: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      scrollArea.removeEventListener("pointerenter", onPointerEnter);
    };
  }, []);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reads rendered row heights so the spacers match them at any viewport width or font size
  useLayoutEffect(() => {
    const heightOf = (kind: RowKind) =>
      groupRef.current?.querySelector(`[data-composer-row-kind=${kind}]`)?.getBoundingClientRect()
        .height ?? rowHeights[kind];
    const measured = { plain: heightOf("plain"), badged: heightOf("badged") };
    if (measured.plain !== rowHeights.plain || measured.badged !== rowHeights.badged) {
      setRowHeights(measured);
    }
  });

  return (
    <CommandGroup ref={groupRef}>
      {renderWindowedRows({
        items: props.items,
        rowHeights,
        scrollTop: scrollStep * SCROLL_STEP_PX,
        viewportHeight,
        overscan: pointerOverList ? POINTER_OVERSCAN_PX : KEYBOARD_OVERSCAN_PX,
        activeItemId: props.activeItemId,
        renderRow: (item, index, slot) => (
          <ComposerCommandMenuItem
            key={slot}
            index={index}
            itemCount={props.items.length}
            optionId={composerSuggestionOptionId(props.listId, item.id)}
            item={item}
            triggerKind={props.triggerKind}
            resolvedTheme={props.resolvedTheme}
            isActive={props.activeItemId === item.id}
            onHighlight={props.onHighlightedItemChange}
            onSelect={props.onSelect}
          />
        ),
      })}
    </CommandGroup>
  );
}

/**
 * Mounts the rows near the viewport and the active row, which stays mounted so
 * aria-activedescendant and scrollIntoView always find it. Equal-height spacers
 * replace the rest, so scroll range and row positions match a full list.
 */
function renderWindowedRows(input: {
  readonly items: ReadonlyArray<ComposerCommandItem>;
  readonly rowHeights: Record<RowKind, number>;
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly overscan: number;
  readonly activeItemId: string | null;
  readonly renderRow: (item: ComposerCommandItem, index: number, slot: string) => ReactNode;
}): ReactNode[] {
  const { items, rowHeights, scrollTop, viewportHeight, overscan, activeItemId, renderRow } = input;
  const windowTop = scrollTop - overscan;
  const windowBottom = scrollTop + SCROLL_STEP_PX + viewportHeight + overscan;
  const rendered: ReactNode[] = [];
  let spacerHeight = 0;
  let spacerStart = 0;
  let offset = 0;
  items.forEach((item, index) => {
    const height = rowHeights[rowKindOf(item)];
    const inWindow = offset + height > windowTop && offset < windowBottom;
    offset += height;
    if (!inWindow && item.id !== activeItemId) {
      spacerHeight += height;
      return;
    }
    if (spacerHeight > 0) {
      rendered.push(
        <div aria-hidden="true" key={`spacer:${spacerStart}`} style={{ height: spacerHeight }} />,
      );
    }
    // Slots reuse row elements across filtering and scrolling instead of replacing them.
    rendered.push(renderRow(item, index, inWindow ? `row:${index % ROW_SLOTS}` : "active"));
    spacerHeight = 0;
    spacerStart = index + 1;
  });
  if (spacerHeight > 0) {
    rendered.push(
      <div aria-hidden="true" key={`spacer:${spacerStart}`} style={{ height: spacerHeight }} />,
    );
  }
  return rendered;
}

const ComposerCommandMenuItem = memo(function ComposerCommandMenuItem(props: {
  index: number;
  itemCount: number;
  optionId: string;
  item: ComposerCommandItem;
  triggerKind: ComposerTriggerKind | null;
  resolvedTheme: "light" | "dark";
  isActive: boolean;
  onHighlight: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const skillSourceKind =
    props.item.type === "skill" ? resolveProviderSkillSourceKind(props.item.skill) : null;
  const isSlashSkill =
    props.triggerKind === "slash-command" && props.item.type === "skill" ? props.item.skill : null;
  const pullRequestPresentation =
    props.item.type === "pull-request" ? resolvePullRequestState(props.item.pullRequest) : null;

  return (
    <CommandItem
      render={<div id={props.optionId} />}
      aria-posinset={props.index + 1}
      aria-setsize={props.itemCount}
      aria-selected={props.isActive}
      value={props.item.id}
      data-composer-item-id={props.item.id}
      data-composer-row-kind={rowKindOf(props.item)}
      active={props.isActive}
      onMouseMove={() => {
        if (!props.isActive) props.onHighlight(props.item.id);
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={() => {
        props.onSelect(props.item);
      }}
    >
      {props.item.type === "path" ? (
        <PierreEntryIcon
          pathValue={props.item.path}
          kind={props.item.pathKind}
          theme={props.resolvedTheme}
        />
      ) : null}
      {props.item.type === "thread" ? (
        <MessagesSquareIcon aria-hidden="true" className="size-4 shrink-0 text-secondary-label" />
      ) : null}
      {props.item.type === "environment" ? (
        <EnvironmentMachineIcon
          kind={props.item.machine}
          aria-hidden="true"
          className="size-4 shrink-0 text-secondary-label"
        />
      ) : null}
      {pullRequestPresentation ? (
        <pullRequestPresentation.Icon
          role="img"
          aria-label={pullRequestPresentation.label}
          className={cn("size-4 shrink-0", pullRequestPresentation.toneClassName)}
        />
      ) : null}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 max-w-[45%] shrink-0 truncate font-sans text-xs font-medium">
          {isSlashSkill ? (
            <>
              <span className="text-secondary-label">/skill:</span>
              {formatProviderSkillDisplayName(isSlashSkill)}
            </>
          ) : (
            props.item.label
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-secondary-label text-xs">
          {props.item.description}
        </span>
        {skillSourceKind ? (
          <SkillSourceBadge
            kind={skillSourceKind}
            showSkillSuffix={props.triggerKind === "skill"}
          />
        ) : null}
      </span>
    </CommandItem>
  );
});

export function composerSuggestionOptionId(listId: string, itemId: string): string {
  // JSON escapes lone UTF-16 surrogates before URI encoding without losing identity.
  return `${listId}-${encodeURIComponent(JSON.stringify(itemId))}`;
}

const LISTBOX_LABEL_BY_TRIGGER: Record<ComposerTriggerKind, string> = {
  path: "Files and folders",
  "pull-request": "Pull requests",
  "slash-command": "Commands",
  skill: "Skills",
};

const SKILL_SOURCE_ICON_BY_KIND: Record<ProviderSkillSourceKind, LucideIcon> = {
  app: BlocksIcon,
  repo: FolderIcon,
  project: FolderIcon,
  personal: UserRoundIcon,
  system: SettingsIcon,
  other: PackageIcon,
};

const SKILL_SOURCE_LABEL_BY_KIND: Record<ProviderSkillSourceKind, string> = {
  app: "App",
  repo: "Repo",
  project: "Project",
  personal: "Personal",
  system: "System",
  other: "Provider",
};

function SkillSourceBadge(props: { kind: ProviderSkillSourceKind; showSkillSuffix: boolean }) {
  const Icon = SKILL_SOURCE_ICON_BY_KIND[props.kind];
  return (
    <Badge className="ms-auto" variant="secondary">
      <Icon aria-hidden="true" className="text-current" />
      {SKILL_SOURCE_LABEL_BY_KIND[props.kind]}
      {props.showSkillSuffix ? " Skill" : null}
    </Badge>
  );
}
