"use client";

import React, { useRef, useLayoutEffect, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Link2,
} from "lucide-react";

export type SelectionAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "heading"
  | "task"
  | "bullet"
  | "number"
  | "quote"
  | "link"
  | "wikilink";

interface FloatingSelectionToolbarProps {
  isOpen: boolean;
  position: { top: number; left: number; height?: number };
  onAction: (action: SelectionAction) => void;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  isOpen,
  position,
  onAction,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 380,
    height: 42,
  });

  // Measure rendered toolbar dimensions to handle dynamic width/height accurately
  useLayoutEffect(() => {
    if (isOpen && toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      if (
        rect.width > 0 &&
        (Math.abs(rect.width - dimensions.width) > 1 ||
          Math.abs(rect.height - dimensions.height) > 1)
      ) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [isOpen, position.left, position.top, dimensions.width, dimensions.height]);

  if (!isOpen) return null;

  const PADDING = 12;
  const TOP_SAFE_MARGIN = 58; // Clearance for top header bar and action controls
  const GAP = 8;
  const lineHeight = position.height || 22;

  const winWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const winHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  // 1. Horizontal Position:
  // Center toolbar horizontally over the cursor / selection center point
  const idealLeft = position.left - dimensions.width / 2;
  const maxLeft = Math.max(PADDING, winWidth - dimensions.width - PADDING);
  const clampedLeft = Math.max(PADDING, Math.min(idealLeft, maxLeft));

  // 2. Vertical Position:
  // Prefer above selection; if space is constrained near top header, flip below
  const spaceAbove = position.top - TOP_SAFE_MARGIN;
  const canFitAbove = spaceAbove >= dimensions.height + GAP;

  let clampedTop: number;
  if (canFitAbove) {
    clampedTop = position.top - dimensions.height - GAP;
  } else {
    // Show below selection line
    clampedTop = position.top + lineHeight + GAP;
    // Prevent clipping below screen viewport
    if (clampedTop + dimensions.height > winHeight - PADDING) {
      clampedTop = Math.max(TOP_SAFE_MARGIN + PADDING, winHeight - dimensions.height - PADDING);
    }
  }

  const items: {
    id: SelectionAction;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortcut?: string;
  }[] = [
    { id: "bold", icon: Bold, label: "Bold", shortcut: "⌘B" },
    { id: "italic", icon: Italic, label: "Italic", shortcut: "⌘I" },
    { id: "strikethrough", icon: Strikethrough, label: "Strikethrough" },
    { id: "code", icon: Code, label: "Inline Code" },
    { id: "heading", icon: Heading, label: "Heading" },
    { id: "task", icon: CheckSquare, label: "Task List" },
    { id: "bullet", icon: List, label: "Bullet List" },
    { id: "number", icon: ListOrdered, label: "Numbered List" },
    { id: "quote", icon: Quote, label: "Quote" },
    { id: "link", icon: LinkIcon, label: "Link" },
    { id: "wikilink", icon: Link2, label: "Wikilink" },
  ];

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top: `${clampedTop}px`,
        left: `${clampedLeft}px`,
        zIndex: 50,
      }}
      className="flex items-center gap-0.5 p-1 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-2xl text-neutral-200 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100 select-none max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar"
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isDividerBefore = idx === 4 || idx === 9;

        return (
          <React.Fragment key={item.id}>
            {isDividerBefore && (
              <div className="h-4 w-px bg-neutral-800 mx-0.5 shrink-0" />
            )}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevents losing textarea selection
                onAction(item.id);
              }}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors relative group"
              title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
