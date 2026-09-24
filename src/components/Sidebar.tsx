"use client";

import React, { useState, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import {
  FileText,
  Plus,
  Search,
  Tag,
  Download,
  Upload,
  Settings,
  Globe,
  Trash2,
  BookOpen,
  CheckSquare,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderInput,
  ChevronRight,
  GripVertical
} from "lucide-react";

interface SidebarProps {
  notes: Note[];
  activeNoteId: number | null;
  onSelectNote: (note: Note) => void;
  onNewNote: (folder?: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenQuickSearch: () => void;
  onOpenImport: () => void;
  onExportAll: () => void;
  onOpenSettings: () => void;
  onDeleteNote: (id: number) => void;
  onMoveNoteToFolder?: (noteId: number, folder: string | undefined) => void;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  activeView: "notes" | "todos";
  onChangeView: (view: "notes" | "todos") => void;
  pendingTodosCount: number;
  folders?: string[];
  onCreateFolder?: (name: string) => void;
  onDeleteFolder?: (name: string) => void;
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
  onOpenQuickSearch,
  onOpenImport,
  onExportAll,
  onOpenSettings,
  onDeleteNote,
  onMoveNoteToFolder,
  isMobileOpen,
  activeView,
  onChangeView,
  pendingTodosCount,
  folders = ["Work", "Home"],
  onCreateFolder,
  onDeleteFolder,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "published">("all");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    Work: true,
    Home: true,
    __unfiled: true,
  });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingNoteId, setMovingNoteId] = useState<number | null>(null);

  // Drag and Drop state
  const [draggedNoteId, setDraggedNoteId] = useState<number | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const dragExpandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close moving dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setMovingNoteId(null);
    if (movingNoteId !== null) {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, [movingNoteId]);

  // Clean up drag timeout on unmount
  useEffect(() => {
    return () => {
      if (dragExpandTimeoutRef.current) clearTimeout(dragExpandTimeoutRef.current);
    };
  }, []);

  // Auto-expand all folders when user searches
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedFolders((prev) => {
        const next = { ...prev };
        folders.forEach((f) => (next[f] = true));
        next["__unfiled"] = true;
        return next;
      });
    }
  }, [searchQuery, folders]);

  // Auto-expand folders that contain notes with the selected tag filter
  useEffect(() => {
    if (selectedTag) {
      setExpandedFolders((prev) => {
        const next = { ...prev };
        folders.forEach((f) => {
          const hasMatchingNote = notes.some(
            (n) => n.folder === f && n.tags.includes(selectedTag)
          );
          if (hasMatchingNote) {
            next[f] = true;
          }
        });
        const hasMatchingUnfiled = notes.some(
          (n) => (!n.folder || n.folder.trim() === "") && n.tags.includes(selectedTag)
        );
        if (hasMatchingUnfiled) {
          next["__unfiled"] = true;
        }
        return next;
      });
    }
  }, [selectedTag, notes, folders]);

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

  // Notes without a folder
  const unfiledNotes = filteredNotes.filter((n) => !n.folder || n.folder.trim() === "");

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: prev[folderName] === undefined ? false : !prev[folderName],
    }));
  };

  const handleAddFolderSubmit = () => {
    const trimmed = newFolderName.trim();
    if (trimmed && onCreateFolder) {
      onCreateFolder(trimmed);
      setExpandedFolders((prev) => ({ ...prev, [trimmed]: true }));
    }
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  const renderNoteRow = (note: Note) => {
    const isActive = activeNoteId === note.id;
    const isMoving = movingNoteId === note.id;
    const isBeingDragged = draggedNoteId === note.id;

    return (
      <div
        key={note.id}
        draggable={true}
        onDragStart={(e) => {
          if (!note.id) return;
          e.dataTransfer.setData("text/plain", String(note.id));
          e.dataTransfer.effectAllowed = "move";
          setDraggedNoteId(note.id);
        }}
        onDragEnd={() => {
          setDraggedNoteId(null);
          setDragOverFolder(null);
          if (dragExpandTimeoutRef.current) clearTimeout(dragExpandTimeoutRef.current);
        }}
        onClick={() => onSelectNote(note)}
        className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all text-xs select-none ${
          isBeingDragged
            ? "opacity-30 border border-dashed border-indigo-400 bg-indigo-950/40"
            : isActive
            ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 font-medium shadow-xs"
            : "text-neutral-300 hover:bg-neutral-900/80 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Subtle drag handle on hover */}
          <GripVertical className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileText
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isActive ? "text-indigo-400" : "text-neutral-500 group-hover:text-neutral-400"
            }`}
          />
          <span className="truncate">{note.title || "Untitled Note"}</span>
          {selectedTag && note.tags.includes(selectedTag) && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30 shrink-0">
              #{selectedTag}
            </span>
          )}
          {note.is_published && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Published Note" />
          )}
        </div>

        {/* Hover Quick Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5">
          {/* Move to folder trigger */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMovingNoteId(isMoving ? null : (note.id ?? null));
              }}
              className={`p-1 rounded hover:bg-neutral-800 transition-colors ${
                isMoving ? "text-indigo-400 bg-neutral-800" : "text-neutral-400 hover:text-indigo-300"
              }`}
              title="Move note to folder..."
            >
              <FolderInput className="w-3.5 h-3.5" />
            </button>

            {/* Move to Folder Dropdown */}
            {isMoving && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-1 text-xs backdrop-blur-xl"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 border-b border-neutral-800/60">
                  Move to Folder
                </div>
                {folders.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      if (note.id) onMoveNoteToFolder?.(note.id, f);
                      setMovingNoteId(null);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-indigo-600/20 hover:text-indigo-200 flex items-center justify-between text-[11px] transition-colors ${
                      note.folder === f ? "text-indigo-400 font-semibold" : "text-neutral-300"
                    }`}
                  >
                    <span className="truncate">📁 {f}</span>
                    {note.folder === f && <span>✓</span>}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (note.id) onMoveNoteToFolder?.(note.id, undefined);
                    setMovingNoteId(null);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 transition-colors border-t border-neutral-800/60 mt-1 pt-1 ${
                    !note.folder ? "text-indigo-400 font-semibold" : ""
                  }`}
                >
                  <span>📄 Unfiled</span>
                  {!note.folder && <span>✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Delete note button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (note.id) onDeleteNote(note.id);
            }}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-80 bg-neutral-950/95 backdrop-blur-xl border-r border-neutral-800 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
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
          onClick={() => onNewNote()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1 text-xs font-semibold"
          title="Create New Note (⌘N)"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* Mode Switcher Bar */}
      <div className="p-2 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center gap-1 text-xs shrink-0">
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
      <div className="p-3 border-b border-neutral-800/60 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes (⌘K or /)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onSearchChange("");
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-9 pr-14 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => onSearchChange("")}
                className="text-xs text-neutral-400 hover:text-neutral-200 p-0.5"
                title="Clear Search (Esc)"
              >
                ✕
              </button>
            ) : (
              <button
                onClick={onOpenQuickSearch}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700/80 transition-colors shadow-xs"
                title="Open Quick Search (⌘K or /)"
              >
                ⌘K
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-800/60 text-xs font-medium shrink-0">
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

      {/* Folders & Compact Notes List (Middle Scrollable Area) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Folders Header */}
        <div className="px-2 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
          <span className="flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span>Folders</span>
          </span>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="px-1.5 py-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-[10px] font-medium"
            title="Create New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Folder</span>
          </button>
        </div>

        {/* Inline New Folder Creation Form */}
        {isCreatingFolder && (
          <div className="px-1 py-1">
            <div className="flex items-center gap-1 bg-neutral-900 border border-indigo-500/60 rounded-lg p-1">
              <Folder className="w-3.5 h-3.5 text-indigo-400 ml-1 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Folder name (e.g. Work, Home)..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFolderSubmit();
                  if (e.key === "Escape") {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }
                }}
                className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none px-1"
              />
              <button
                onClick={handleAddFolderSubmit}
                className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shrink-0"
                title="Create (Enter)"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-[10px] shrink-0"
                title="Cancel (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Folders List with Drag-and-Drop Drop Targets */}
        {folders.map((folderName) => {
          const isExpanded = expandedFolders[folderName] ?? true;
          const folderNotes = filteredNotes.filter((n) => n.folder === folderName);
          const isDropTarget = dragOverFolder === folderName;
          const hasTagMatch = Boolean(selectedTag && folderNotes.length > 0);
          const isDimmedByTag = Boolean(selectedTag && folderNotes.length === 0);

          return (
            <div
              key={folderName}
              className={`mb-0.5 rounded-xl transition-all ${
                isDropTarget
                  ? "bg-indigo-950/60 ring-2 ring-indigo-500 shadow-lg shadow-indigo-950/50 scale-[1.01]"
                  : hasTagMatch
                  ? "bg-indigo-950/20"
                  : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverFolder !== folderName) {
                  setDragOverFolder(folderName);
                  if (!isExpanded) {
                    if (dragExpandTimeoutRef.current) clearTimeout(dragExpandTimeoutRef.current);
                    dragExpandTimeoutRef.current = setTimeout(() => {
                      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
                    }, 500);
                  }
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverFolder === folderName) {
                  setDragOverFolder(null);
                  if (dragExpandTimeoutRef.current) clearTimeout(dragExpandTimeoutRef.current);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const noteIdStr = e.dataTransfer.getData("text/plain");
                const noteId = Number(noteIdStr);
                if (noteId && onMoveNoteToFolder) {
                  const targetNote = notes.find((n) => n.id === noteId);
                  if (targetNote && targetNote.folder !== folderName) {
                    onMoveNoteToFolder(noteId, folderName);
                    setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
                  }
                }
                setDragOverFolder(null);
                setDraggedNoteId(null);
                if (dragExpandTimeoutRef.current) clearTimeout(dragExpandTimeoutRef.current);
              }}
            >
              {/* Folder Header Row */}
              <div
                onClick={() => toggleFolder(folderName)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                  isDropTarget
                    ? "bg-indigo-600/30 text-white"
                    : hasTagMatch
                    ? "bg-indigo-950/40 border border-indigo-500/40 text-indigo-100 shadow-xs"
                    : isDimmedByTag
                    ? "opacity-40 hover:opacity-80 text-neutral-500 hover:bg-neutral-900/60"
                    : "hover:bg-neutral-900/60 text-neutral-300 hover:text-neutral-100"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
                      isExpanded ? "rotate-90 text-indigo-400" : "text-neutral-500"
                    }`}
                  />
                  {isExpanded || isDropTarget ? (
                    <FolderOpen className={`w-4 h-4 shrink-0 ${hasTagMatch ? "text-indigo-400" : "text-amber-400"}`} />
                  ) : (
                    <Folder className={`w-4 h-4 shrink-0 ${hasTagMatch ? "text-indigo-400" : "text-amber-500/80"}`} />
                  )}
                  <span className="truncate">{folderName}</span>
                  <span className="text-[10px] font-mono text-neutral-500 font-normal">
                    ({folderNotes.length})
                  </span>

                  {hasTagMatch && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-medium ml-1">
                      #{selectedTag} ({folderNotes.length})
                    </span>
                  )}

                  {isDropTarget && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 animate-pulse font-normal ml-auto mr-2">
                      Drop here
                    </span>
                  )}
                </div>

                {/* Folder Hover Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewNote(folderName);
                      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
                    }}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-indigo-300 transition-colors"
                    title={`Add note to "${folderName}"`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {onDeleteFolder && !["Work", "Home"].includes(folderName) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folderName);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-colors"
                      title={`Delete folder "${folderName}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Indented Note Titles */}
              {isExpanded && (
                <div className="pl-4 pr-1 space-y-0.5 mt-0.5 border-l border-neutral-800/60 ml-3.5">
                  {folderNotes.length === 0 ? (
                    <div className="py-1 px-2 text-[11px] text-neutral-600 italic">
                      {isDropTarget ? "Drop note here" : "Empty folder"}
                    </div>
                  ) : (
                    folderNotes.map(renderNoteRow)
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unfiled Notes Section (Also a drop target to unfile notes) */}
        {unfiledNotes.length > 0 && (() => {
          const unfiledHasTagMatch = Boolean(selectedTag && unfiledNotes.length > 0);
          const unfiledDimmed = Boolean(selectedTag && unfiledNotes.length === 0);

          return (
            <div
              className={`mb-0.5 mt-2 pt-2 border-t border-neutral-900 rounded-xl transition-all ${
                dragOverFolder === "__unfiled"
                  ? "bg-neutral-900/90 ring-2 ring-indigo-500/80 shadow-lg shadow-indigo-950/40 scale-[1.01]"
                  : unfiledHasTagMatch
                  ? "bg-indigo-950/20"
                  : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverFolder !== "__unfiled") {
                  setDragOverFolder("__unfiled");
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverFolder === "__unfiled") {
                  setDragOverFolder(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const noteIdStr = e.dataTransfer.getData("text/plain");
                const noteId = Number(noteIdStr);
                if (noteId && onMoveNoteToFolder) {
                  const targetNote = notes.find((n) => n.id === noteId);
                  if (targetNote && targetNote.folder) {
                    onMoveNoteToFolder(noteId, undefined);
                    setExpandedFolders((prev) => ({ ...prev, __unfiled: true }));
                  }
                }
                setDragOverFolder(null);
                setDraggedNoteId(null);
              }}
            >
              <div
                onClick={() => toggleFolder("__unfiled")}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-colors ${
                  dragOverFolder === "__unfiled"
                    ? "bg-indigo-600/30 text-white"
                    : unfiledHasTagMatch
                    ? "bg-indigo-950/40 border border-indigo-500/40 text-indigo-100"
                    : unfiledDimmed
                    ? "opacity-40 hover:opacity-80 text-neutral-500"
                    : "hover:bg-neutral-900/60 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
                      (expandedFolders["__unfiled"] ?? true) ? "rotate-90 text-indigo-400" : "text-neutral-500"
                    }`}
                  />
                  <FileText className={`w-4 h-4 shrink-0 ${unfiledHasTagMatch ? "text-indigo-400" : "text-neutral-500"}`} />
                  <span className="truncate">Unfiled Notes</span>
                  <span className="text-[10px] font-mono text-neutral-500 font-normal">
                    ({unfiledNotes.length})
                  </span>
                  {unfiledHasTagMatch && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-medium ml-1">
                      #{selectedTag} ({unfiledNotes.length})
                    </span>
                  )}
                  {dragOverFolder === "__unfiled" && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 animate-pulse font-normal ml-auto mr-2">
                      Drop to unfile
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewNote(undefined);
                    }}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-indigo-300 transition-colors"
                    title="Add unfiled note"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {(expandedFolders["__unfiled"] ?? true) && (
                <div className="pl-4 pr-1 space-y-0.5 mt-0.5 border-l border-neutral-800/60 ml-3.5">
                  {unfiledNotes.map(renderNoteRow)}
                </div>
              )}
            </div>
          );
        })()}

        {/* Empty state when no notes match search or filters */}
        {filteredNotes.length === 0 && (
          <div className="py-12 text-center text-xs text-neutral-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No notes found</p>
          </div>
        )}
      </div>

      {/* Tags Section (Placed at the bottom of the sidebar, above footer) */}
      {allTags.length > 0 && (
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/80 max-h-36 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-2 text-xs font-semibold text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tags</span>
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

      {/* Footer Controls */}
      <div className="p-3 border-t border-neutral-800/80 flex items-center justify-between bg-neutral-950 shrink-0">
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
