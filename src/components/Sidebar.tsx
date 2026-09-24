"use client";

import React, { useState } from "react";
import { Note } from "@/lib/types";
import { extractExcerpt } from "@/lib/markdown";
import {
  FileText,
  Plus,
  Search,
  Tag,
  Download,
  Upload,
  Settings,
  Sparkles,
  Globe,
  Trash2,
  ChevronRight,
  BookOpen,
  CheckSquare
} from "lucide-react";

interface SidebarProps {
  notes: Note[];
  activeNoteId: number | null;
  onSelectNote: (note: Note) => void;
  onNewNote: () => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenImport: () => void;
  onExportAll: () => void;
  onOpenSettings: () => void;
  onDeleteNote: (id: number) => void;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  activeView: "notes" | "todos";
  onChangeView: (view: "notes" | "todos") => void;
  pendingTodosCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  selectedTag,
  onSelectTag,
  searchQuery,
  onSearchChange,
  onOpenImport,
  onExportAll,
  onOpenSettings,
  onDeleteNote,
  isMobileOpen,
  activeView,
  onChangeView,
  pendingTodosCount,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "published">("all");

  // Collect all unique tags and count occurrences
  const tagCounts = notes.reduce<Record<string, number>>((acc, note) => {
    note.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const allTags = Object.keys(tagCounts).sort();

  // Filter notes based on search, tag, and publish status
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    const matchesPublished = filterMode === "all" || note.is_published;

    return matchesSearch && matchesTag && matchesPublished;
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-80 bg-neutral-950/95 backdrop-blur-xl border-r border-neutral-800 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-neutral-100 flex items-center gap-1.5">
              MyNotes <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">Next</span>
            </h1>
            <p className="text-xs text-neutral-400">IndexedDB Local Storage</p>
          </div>
        </div>

        <button
          onClick={onNewNote}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1 text-xs font-semibold"
          title="Create New Note (⌘N)"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* Mode Switcher Bar */}
      <div className="p-2 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center gap-1 text-xs">
        <button
          onClick={() => onChangeView("notes")}
          className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition-all ${
            activeView === "notes"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes ({notes.length})</span>
        </button>

        <button
          onClick={() => onChangeView("todos")}
          className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition-all ${
            activeView === "todos"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Todos</span>
          {pendingTodosCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 text-[10px] font-bold border border-indigo-700/50">
              {pendingTodosCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick Search */}
      <div className="p-3 border-b border-neutral-800/60">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search notes (⌘K or /)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-800/60 text-xs font-medium">
        <button
          onClick={() => setFilterMode("all")}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            filterMode === "all" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>All ({notes.length})</span>
        </button>
        <button
          onClick={() => setFilterMode("published")}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            filterMode === "published" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Public ({notes.filter((n) => n.is_published).length})</span>
        </button>
      </div>

      {/* Tags Section */}
      {allTags.length > 0 && (
        <div className="p-3 border-b border-neutral-800/60 max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 text-xs font-semibold text-neutral-400">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-400" /> Tags
            </span>
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[10px] text-indigo-400 hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => onSelectTag(isSelected ? null : tag)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                  }`}
                >
                  #{tag} <span className="text-[9px] opacity-70">({tagCounts[tag]})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Note List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No notes found</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = activeNoteId === note.id;
            const excerpt = extractExcerpt(note.content, 80);

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? "bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50"
                    : "bg-neutral-900/30 border-transparent hover:bg-neutral-900/80 hover:border-neutral-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3
                    className={`font-semibold text-xs line-clamp-1 ${
                      isActive ? "text-indigo-300" : "text-neutral-200 group-hover:text-white"
                    }`}
                  >
                    {note.title || "Untitled Note"}
                  </h3>
                  {note.is_published && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Published Note" />
                  )}
                </div>

                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mb-2 font-normal">
                  {excerpt || "Empty note content..."}
                </p>

                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-800/40">
                  <span>
                    {new Date(note.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (note.id) onDeleteNote(note.id);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <ChevronRight className="w-3 h-3 text-neutral-400" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-neutral-800/80 flex items-center justify-between bg-neutral-950">
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenImport}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors text-xs flex items-center gap-1.5"
            title="Import .md Files"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            onClick={onExportAll}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors text-xs flex items-center gap-1.5"
            title="Export All Notes (.md)"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export</span>
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          title="App Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
