"use client";

import React, { useEffect, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code2,
  Workflow,
  Calculator,
  Minus,
  Link2,
  Image as ImageIcon,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  Table as TableIcon,
  Type,
} from "lucide-react";

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  category: "Basic Blocks" | "Lists & Tasks" | "Callouts" | "Advanced";
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  keywords: string[];
  execute: (currentLinePrefix: string) => {
    replacement: string;
    cursorOffset: number; // cursor offset relative to replacement start
  };
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Basic Blocks
  {
    id: "text",
    title: "Text",
    description: "Just start typing plain text",
    category: "Basic Blocks",
    icon: Type,
    iconBg: "bg-neutral-800",
    iconColor: "text-neutral-300",
    keywords: ["text", "paragraph", "plain", "normal"],
    execute: () => ({ replacement: "", cursorOffset: 0 }),
  },
  {
    id: "h1",
    title: "Heading 1",
    description: "Large section heading",
    category: "Basic Blocks",
    icon: Heading1,
    iconBg: "bg-indigo-950/60",
    iconColor: "text-indigo-400",
    keywords: ["heading", "h1", "title", "large"],
    execute: () => ({ replacement: "# ", cursorOffset: 2 }),
  },
  {
    id: "h2",
    title: "Heading 2",
    description: "Medium section heading",
    category: "Basic Blocks",
    icon: Heading2,
    iconBg: "bg-indigo-950/60",
    iconColor: "text-indigo-400",
    keywords: ["heading", "h2", "subtitle", "medium"],
    execute: () => ({ replacement: "## ", cursorOffset: 3 }),
  },
  {
    id: "h3",
    title: "Heading 3",
    description: "Small section heading",
    category: "Basic Blocks",
    icon: Heading3,
    iconBg: "bg-indigo-950/60",
    iconColor: "text-indigo-400",
    keywords: ["heading", "h3", "subheading", "small"],
    execute: () => ({ replacement: "### ", cursorOffset: 4 }),
  },
  {
    id: "divider",
    title: "Divider",
    description: "Horizontal visual dividing rule",
    category: "Basic Blocks",
    icon: Minus,
    iconBg: "bg-neutral-800",
    iconColor: "text-neutral-400",
    keywords: ["divider", "separator", "hr", "line", "rule"],
    execute: () => ({ replacement: "\n---\n\n", cursorOffset: 6 }),
  },

  // Lists & Tasks
  {
    id: "task",
    title: "To-do List",
    description: "Track tasks with interactive checkboxes",
    category: "Lists & Tasks",
    icon: CheckSquare,
    iconBg: "bg-emerald-950/60",
    iconColor: "text-emerald-400",
    keywords: ["todo", "task", "checkbox", "done", "check"],
    execute: () => ({ replacement: "- [ ] ", cursorOffset: 6 }),
  },
  {
    id: "bullet",
    title: "Bulleted List",
    description: "Create a simple bulleted list",
    category: "Lists & Tasks",
    icon: List,
    iconBg: "bg-neutral-800",
    iconColor: "text-neutral-300",
    keywords: ["bullet", "unordered", "list", "point"],
    execute: () => ({ replacement: "- ", cursorOffset: 2 }),
  },
  {
    id: "number",
    title: "Numbered List",
    description: "Create an ordered numbered list",
    category: "Lists & Tasks",
    icon: ListOrdered,
    iconBg: "bg-amber-950/60",
    iconColor: "text-amber-400",
    keywords: ["numbered", "ordered", "list", "number", "1."],
    execute: () => ({ replacement: "1. ", cursorOffset: 3 }),
  },

  // Callouts & Quotes
  {
    id: "callout-note",
    title: "Note Callout",
    description: "Highlight important context with an icon",
    category: "Callouts",
    icon: AlertCircle,
    iconBg: "bg-blue-950/60",
    iconColor: "text-blue-400",
    keywords: ["callout", "note", "info", "box"],
    execute: () => ({ replacement: "> [!NOTE]\n> ", cursorOffset: 12 }),
  },
  {
    id: "callout-tip",
    title: "Tip Callout",
    description: "Share helpful suggestions or tips",
    category: "Callouts",
    icon: Lightbulb,
    iconBg: "bg-emerald-950/60",
    iconColor: "text-emerald-400",
    keywords: ["tip", "hint", "suggestion", "idea"],
    execute: () => ({ replacement: "> [!TIP]\n> ", cursorOffset: 11 }),
  },
  {
    id: "callout-warning",
    title: "Warning Callout",
    description: "Cautionary alert or critical notice",
    category: "Callouts",
    icon: AlertTriangle,
    iconBg: "bg-amber-950/60",
    iconColor: "text-amber-400",
    keywords: ["warning", "alert", "caution", "danger"],
    execute: () => ({ replacement: "> [!WARNING]\n> ", cursorOffset: 15 }),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a prominent quotation",
    category: "Callouts",
    icon: Quote,
    iconBg: "bg-purple-950/60",
    iconColor: "text-purple-400",
    keywords: ["quote", "blockquote", "cite"],
    execute: () => ({ replacement: "> ", cursorOffset: 2 }),
  },

  // Advanced Blocks
  {
    id: "code",
    title: "Code Block",
    description: "Code snippet with syntax highlighting",
    category: "Advanced",
    icon: Code2,
    iconBg: "bg-cyan-950/60",
    iconColor: "text-cyan-400",
    keywords: ["code", "pre", "syntax", "javascript", "typescript", "python"],
    execute: () => ({ replacement: "```typescript\n\n```", cursorOffset: 14 }),
  },
  {
    id: "mermaid",
    title: "Mermaid Diagram",
    description: "Render flowcharts and sequence diagrams",
    category: "Advanced",
    icon: Workflow,
    iconBg: "bg-emerald-950/60",
    iconColor: "text-emerald-400",
    keywords: ["mermaid", "diagram", "flowchart", "graph", "chart"],
    execute: () => ({
      replacement: "```mermaid\ngraph TD;\n    A[Start] --> B[Process];\n    B --> C[End];\n```\n",
      cursorOffset: 57,
    }),
  },
  {
    id: "math",
    title: "Math Formula",
    description: "LaTeX / KaTeX mathematical equation",
    category: "Advanced",
    icon: Calculator,
    iconBg: "bg-pink-950/60",
    iconColor: "text-pink-400",
    keywords: ["math", "latex", "katex", "equation", "formula"],
    execute: () => ({ replacement: "$$\n\n$$\n", cursorOffset: 3 }),
  },
  {
    id: "table",
    title: "Table",
    description: "Insert a clean Markdown data table",
    category: "Advanced",
    icon: TableIcon,
    iconBg: "bg-indigo-950/60",
    iconColor: "text-indigo-400",
    keywords: ["table", "grid", "rows", "columns"],
    execute: () => ({
      replacement: "\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n\n",
      cursorOffset: 3,
    }),
  },
  {
    id: "wikilink",
    title: "Internal Note Link",
    description: "Bi-directional link to another note [[note]]",
    category: "Advanced",
    icon: Link2,
    iconBg: "bg-violet-950/60",
    iconColor: "text-violet-400",
    keywords: ["wikilink", "link", "internal", "note", "reference"],
    execute: () => ({ replacement: "[[", cursorOffset: 2 }),
  },
  {
    id: "image",
    title: "Image",
    description: "Embed an external or local image",
    category: "Advanced",
    icon: ImageIcon,
    iconBg: "bg-rose-950/60",
    iconColor: "text-rose-400",
    keywords: ["image", "photo", "picture", "img"],
    execute: () => ({ replacement: "![Description](", cursorOffset: 14 }),
  },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  query: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  onHoverIndex: (index: number) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  position,
  query,
  selectedIndex,
  onSelect,
  onClose,
  onHoverIndex,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Filter commands by query
  const cleanQuery = query.toLowerCase().trim();
  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!cleanQuery) return true;
    return (
      cmd.title.toLowerCase().includes(cleanQuery) ||
      cmd.description.toLowerCase().includes(cleanQuery) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  });

  // Auto-scroll selected item into view inside menu
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group commands by category
  let globalIndexCounter = 0;
  const categories = Array.from(new Set(filteredCommands.map((c) => c.category)));

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${Math.min(position.top, window.innerHeight - 360)}px`,
        left: `${Math.min(position.left, window.innerWidth - 320)}px`,
        zIndex: 50,
      }}
      className="w-80 max-h-80 overflow-y-auto bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl shadow-2xl p-1.5 text-neutral-200 transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 ring-1 ring-white/10"
    >
      {filteredCommands.length === 0 ? (
        <div className="py-6 px-4 text-center">
          <p className="text-xs text-neutral-400 font-medium">No matching blocks found</p>
          <p className="text-[11px] text-neutral-500 mt-1">Try &quot;/h1&quot;, &quot;/todo&quot;, &quot;/quote&quot;, or &quot;/callout&quot;</p>
        </div>
      ) : (
        categories.map((category) => {
          const items = filteredCommands.filter((c) => c.category === category);
          return (
            <div key={category} className="flex flex-col">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                {category}
              </div>
              {items.map((cmd) => {
                const itemIndex = filteredCommands.findIndex((c) => c.id === cmd.id);
                const isSelected = itemIndex === selectedIndex;
                const Icon = cmd.icon;

                return (
                  <button
                    key={cmd.id}
                    ref={isSelected ? selectedItemRef : undefined}
                    type="button"
                    onMouseMove={() => {
                      if (selectedIndex !== itemIndex) {
                        onHoverIndex(itemIndex);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent losing textarea focus
                      onSelect(cmd);
                    }}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "hover:bg-neutral-800/80 text-neutral-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : `${cmd.iconBg} ${cmd.iconColor}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-tight truncate">
                        {cmd.title}
                      </div>
                      <div
                        className={`text-[11px] truncate leading-tight mt-0.5 ${
                          isSelected ? "text-indigo-100" : "text-neutral-400"
                        }`}
                      >
                        {cmd.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })
      )}

      {/* Footer shortcut tips */}
      <div className="mt-1 pt-1.5 border-t border-neutral-800 px-2 py-1 flex items-center justify-between text-[10px] text-neutral-400 select-none">
        <span>↑ ↓ Navigate</span>
        <span>↵ Select</span>
        <span>Esc Dismiss</span>
      </div>
    </div>
  );
};
