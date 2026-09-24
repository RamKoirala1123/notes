"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Note } from "@/lib/types";
import {
  Search,
  FileText,
  Plus,
  Eye,
  Save,
  CheckSquare,
  Upload,
  Download,
  Settings,
  X,
  Tag,
  ArrowRight,
  Clock,
  Sparkles
} from "lucide-react";

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  activeNote: Note | null;
  onSelectNote: (note: Note) => void;
  onCreateNewNote: (customTitle?: string) => void;
  onTogglePreview: () => void;
  onSaveCurrentNote: () => void;
  onChangeView: (view: "notes" | "todos") => void;
  onOpenImport: () => void;
  onExportAll: () => void;
  onOpenSettings: () => void;
}

type PaletteNote = {
  type: "note";
  id: string;
  note: Note;
  title: string;
  snippet: string;
  tags: string[];
};

type PaletteAction = {
  type: "action";
  id: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  icon: React.ReactNode;
  perform: () => void;
};

type PaletteItem = PaletteNote | PaletteAction;

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  activeNote,
  onSelectNote,
  onCreateNewNote,
  onTogglePreview,
  onSaveCurrentNote,
  onChangeView,
  onOpenImport,
  onExportAll,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened and reset query
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Actions list
  const actions: PaletteAction[] = useMemo(() => [
    {
      type: "action",
      id: "action-new-note",
      title: "Create New Note",
      subtitle: "Add a blank markdown note to workspace",
      shortcut: "⌘N",
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      perform: () => {
        onCreateNewNote();
        onClose();
      },
    },
    {
      type: "action",
      id: "action-toggle-preview",
      title: "Toggle Preview Mode",
      subtitle: "Switch between split mode and preview mode",
      shortcut: "⌘P / Ctrl+P",
      icon: <Eye className="w-4 h-4 text-indigo-400" />,
      perform: () => {
        onTogglePreview();
        onClose();
      },
    },
    {
      type: "action",
      id: "action-save-note",
      title: "Save Current Note",
      subtitle: activeNote ? `Save "${activeNote.title}" immediately` : "Save changes to storage",
      shortcut: "⌘S",
      icon: <Save className="w-4 h-4 text-cyan-400" />,
      perform: () => {
        onSaveCurrentNote();
        onClose();
      },
    },
    {
      type: "action",
      id: "action-todos",
      title: "Go to Todos Workspace",
      subtitle: "Manage your tasks and checklist items",
      icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
      perform: () => {
        onChangeView("todos");
        onClose();
      },
    },
    {
      type: "action",
      id: "action-import",
      title: "Import Markdown Files",
      subtitle: "Import .md documents from your device",
      icon: <Upload className="w-4 h-4 text-amber-400" />,
      perform: () => {
        onOpenImport();
        onClose();
      },
    },
    {
      type: "action",
      id: "action-export",
      title: "Export All Notes",
      subtitle: "Download all notes as markdown files",
      icon: <Download className="w-4 h-4 text-blue-400" />,
      perform: () => {
        onExportAll();
        onClose();
      },
    },
    {
      type: "action",
      id: "action-settings",
      title: "Open Settings",
      subtitle: "Manage database, storage, and demo notes",
      icon: <Settings className="w-4 h-4 text-neutral-400" />,
      perform: () => {
        onOpenSettings();
        onClose();
      },
    },
  ], [activeNote, onCreateNewNote, onTogglePreview, onSaveCurrentNote, onChangeView, onOpenImport, onExportAll, onOpenSettings, onClose]);

  // Filter notes and build flattened items list
  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // When no query: show up to 5 recent notes followed by actions
      const recentNotes: PaletteItem[] = notes.slice(0, 5).map((note) => ({
        type: "note",
        id: `note-${note.id}`,
        note,
        title: note.title || "Untitled Note",
        snippet: note.content.replace(/^#+\s+/gm, "").slice(0, 100).replace(/\n/g, " "),
        tags: note.tags || [],
      }));

      return [...recentNotes, ...actions];
    }

    // Filter notes matching title, content, or tag
    const matchingNotes: PaletteItem[] = notes
      .filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(q);
        const contentMatch = note.content.toLowerCase().includes(q);
        const tagMatch = note.tags.some((t) => t.toLowerCase().includes(q.replace(/^#/, "")));
        return titleMatch || contentMatch || tagMatch;
      })
      .map((note) => {
        // Find best snippet preview around match
        let snippet = "";
        const lowerContent = note.content.toLowerCase();
        const matchIdx = lowerContent.indexOf(q);
        if (matchIdx !== -1) {
          const start = Math.max(0, matchIdx - 30);
          const end = Math.min(note.content.length, matchIdx + q.length + 60);
          snippet = (start > 0 ? "..." : "") + note.content.substring(start, end).replace(/\n/g, " ") + (end < note.content.length ? "..." : "");
        } else {
          snippet = note.content.replace(/^#+\s+/gm, "").slice(0, 90).replace(/\n/g, " ");
        }

        return {
          type: "note",
          id: `note-${note.id}`,
          note,
          title: note.title || "Untitled Note",
          snippet,
          tags: note.tags || [],
        };
      });

    // Also filter matching actions
    const matchingActions = actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    const result: PaletteItem[] = [...matchingNotes, ...matchingActions];

    // If query does not match any note, offer to create note titled with the query
    if (matchingNotes.length === 0 && q.length > 0) {
      result.unshift({
        type: "action",
        id: "create-query-note",
        title: `Create new note "${query.trim()}"`,
        subtitle: "Press Enter to create and open this note",
        shortcut: "↵",
        icon: <Plus className="w-4 h-4 text-indigo-400" />,
        perform: () => {
          onCreateNewNote(query.trim());
          onClose();
        },
      });
    }

    return result;
  }, [query, notes, actions, onCreateNewNote, onClose]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected element into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation inside the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentItem = items[selectedIndex];
      if (currentItem) {
        handleSelectItem(currentItem);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectItem = (item: PaletteItem) => {
    if (item.type === "note") {
      onSelectNote(item.note);
      onClose();
    } else if (item.type === "action") {
      item.perform();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md transition-all animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] backdrop-blur-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-neutral-800/90 flex items-center gap-3 bg-neutral-950/60">
          <Search className="w-5 h-5 text-indigo-400 shrink-0 ml-1.5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search notes or run actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-neutral-800/80 border border-neutral-700/80 text-neutral-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-neutral-400" />
              <p className="text-xs">No notes or commands found for &quot;{query}&quot;</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = selectedIndex === idx;

              if (item.type === "note") {
                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 border ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500/50 text-neutral-100 shadow-sm"
                        : "border-transparent text-neutral-300 hover:bg-neutral-800/50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-xs text-neutral-100 truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.note.folder && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-300 border border-amber-800/50 font-medium">
                              📁 {item.note.folder}
                            </span>
                          )}
                          {item.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60"
                            >
                              #{t}
                            </span>
                          ))}
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(item.note.updated_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-400 line-clamp-1 leading-relaxed">
                        {item.snippet}
                      </p>
                    </div>

                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 self-center shrink-0" />
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 border ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500/50 text-neutral-100 shadow-sm"
                      : "border-transparent text-neutral-300 hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? "bg-indigo-600/40 text-white" : "bg-neutral-800/80 text-neutral-400"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <h4 className="font-semibold text-xs text-neutral-200">{item.title}</h4>
                      <p className="text-[11px] text-neutral-400 truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800/90 border border-neutral-700 text-neutral-400 shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">esc</kbd> close
            </span>
          </div>
          <div className="flex items-center gap-1 text-indigo-400 text-[10px]">
            <Sparkles className="w-3 h-3" /> Quick Switcher
          </div>
        </div>
      </div>
    </div>
  );
};
