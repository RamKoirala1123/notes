"use client";

import React from "react";
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
  position: { top: number; left: number };
  onAction: (action: SelectionAction) => void;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  isOpen,
  position,
  onAction,
}) => {
  if (!isOpen) return null;

  // Clamp position within window bounds
  const clampedTop = Math.max(12, position.top - 48);
  const clampedLeft = Math.max(16, Math.min(position.left - 160, window.innerWidth - 380));

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
      style={{
        position: "fixed",
        top: `${clampedTop}px`,
        left: `${clampedLeft}px`,
        zIndex: 50,
      }}
      className="flex items-center gap-0.5 p-1 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-2xl text-neutral-200 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100 select-none"
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
