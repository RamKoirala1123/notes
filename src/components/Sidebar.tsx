"use client";

import React, { useState, useEffect, useRef } from "react";
import { Note, Todo, TodoList } from "@/lib/types";
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
  GripVertical,
  ChevronsDownUp,
  ClipboardList,
  GraduationCap,
  X,
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
  activeView: "notes" | "todos" | "tags";
  onChangeView: (view: "notes" | "todos" | "tags") => void;
  pendingTodosCount: number;
  folders?: string[];
  onCreateFolder?: (name: string) => void;
  onDeleteFolder?: (name: string) => void;
  todoLists?: TodoList[];
  activeTodoListId?: number | null;
  onSelectTodoList?: (id: number) => void;
  onCreateTodoList?: (title: string) => Promise<number | void>;
  onDeleteTodoList?: (id: number) => void;
  todos?: Todo[];
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
  onToggleMobile,
  activeView,
  onChangeView,
  pendingTodosCount,
  folders = ["Work", "Home"],
  onCreateFolder,
  onDeleteFolder,
  todoLists = [],
  activeTodoListId = null,
  onSelectTodoList,
  onCreateTodoList,
  onDeleteTodoList,
  todos = [],
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "published">("all");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingNoteId, setMovingNoteId] = useState<number | null>(null);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);

  // Todo Lists creation state
  const [isCreatingTodoList, setIsCreatingTodoList] = useState(false);
  const [newTodoListTitle, setNewTodoListTitle] = useState("");

  // Todo tags
  const todoTags = Array.from(
    new Set(todos.flatMap((t) => t.tags || []))
  ).sort();

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

  // Collect all unique tags and count occurrences for Notes & Todos
  const tagCounts = notes.reduce<Record<string, number>>((acc, note) => {
    (note.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const todoTagCounts = todos.reduce<Record<string, number>>((acc, todo) => {
    (todo.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const allTags = Array.from(
    new Set([...Object.keys(tagCounts), ...Object.keys(todoTagCounts)])
  ).sort();

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
      [folderName]: !prev[folderName],
    }));
  };

  const hasExpandedFolders = Object.values(expandedFolders).some(Boolean);

  const handleCollapseAllFolders = () => {
    setExpandedFolders({});
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
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-xs select-none ${
          isBeingDragged
            ? "opacity-30 border border-dashed border-white/[0.2] bg-white/[0.02]"
            : isActive
            ? "bg-white/[0.08] text-white font-medium border-l-2 border-neutral-300 pl-2 shadow-xs"
            : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Subtle drag handle on hover */}
          <GripVertical className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileText
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isActive ? "text-neutral-200" : "text-neutral-500 group-hover:text-neutral-400"
            }`}
          />
          <span className="truncate">{note.title || "Untitled Note"}</span>
          {selectedTag && note.tags.includes(selectedTag) && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-neutral-300 font-medium border border-white/[0.08] shrink-0">
              #{selectedTag}
            </span>
          )}
          {note.is_published && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0" title="Published Note" />
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
      {/* Sleek Brand Header */}
      <div className="h-12 border-b border-white/[0.06] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-neutral-200">
            <BookOpen className="w-3.5 h-3.5 text-neutral-300" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-neutral-200 tracking-tight leading-none">
              Notes
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              onNewNote();
              if (isMobileOpen) onToggleMobile();
            }}
            className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.08] transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Create New Note (⌘N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <button
            type="button"
            onClick={onToggleMobile}
            className="md:hidden p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
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
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-12 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-white/[0.2] transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => onSearchChange("")}
                className="text-xs text-neutral-500 hover:text-neutral-300 p-0.5"
                title="Clear Search (Esc)"
              >
                ✕
              </button>
            ) : (
              <button
                onClick={onOpenQuickSearch}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-500 hover:text-neutral-300 border border-white/[0.06] bg-white/[0.02]"
                title="Open Quick Search (⌘K or /)"
              >
                ⌘K
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation & Filter Bar */}
      <div className="px-3 pb-2 flex items-center justify-between gap-1.5 shrink-0 border-b border-white/[0.06]">
        {/* Notes vs Todos vs Tags Segmented Control */}
        <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex-1 text-xs">
          <button
            onClick={() => onChangeView("notes")}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 text-[11px] transition-all ${
              activeView === "notes"
                ? "bg-white/[0.1] text-white font-medium shadow-xs"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>

          <button
            onClick={() => onChangeView("todos")}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 text-[11px] transition-all ${
              activeView === "todos"
                ? "bg-white/[0.1] text-white font-medium shadow-xs"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Todos</span>
            {pendingTodosCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-white/[0.1] text-neutral-300 text-[9px] font-medium">
                {pendingTodosCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onChangeView("tags")}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 text-[11px] transition-all ${
              activeView === "tags"
                ? "bg-white/[0.1] text-white font-medium shadow-xs"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Tags</span>
            {allTags.length > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-white/[0.1] text-amber-300 text-[9px] font-mono">
                {allTags.length}
              </span>
            )}
          </button>
        </div>

        {/* Quiet Public Filter for Notes, or + New List for Todos */}
        {activeView === "notes" ? (
          <button
            onClick={() => setFilterMode(filterMode === "all" ? "published" : "all")}
            className={`p-1.5 rounded-lg border transition-colors ${
              filterMode === "published"
                ? "bg-white/[0.1] text-white border-white/[0.15]"
                : "bg-white/[0.02] text-neutral-500 hover:text-neutral-300 border-white/[0.06]"
            }`}
            title={filterMode === "published" ? "Showing Public Notes (click to show all)" : "Filter to Public Notes only"}
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
        ) : activeView === "todos" ? (
          <button
            onClick={() => setIsCreatingTodoList(true)}
            className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Create New Todo List"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Main Unified Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        {activeView === "tags" ? (
          /* Dedicated Tags Sidebar Content */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>All Tags ({allTags.length})</span>
              </div>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => onSelectTag(null)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Tags List */}
            {allTags.length > 0 ? (
              <div className="space-y-1">
                {allTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  const noteCount = tagCounts[tag] || 0;
                  const todoCount = todoTagCounts[tag] || 0;

                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        onSelectTag(isSelected ? null : tag);
                        if (isMobileOpen) onToggleMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/30 font-medium shadow-xs"
                          : "bg-white/[0.02] border border-white/[0.04] text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-amber-400 font-bold">#</span>
                        <span className="truncate">{tag}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {noteCount > 0 && (
                          <span className="text-[10px] text-sky-400 flex items-center gap-0.5" title={`${noteCount} notes`}>
                            <FileText className="w-3 h-3" />
                            {noteCount}
                          </span>
                        )}
                        {todoCount > 0 && (
                          <span className="text-[10px] text-indigo-400 flex items-center gap-0.5" title={`${todoCount} todos`}>
                            <CheckSquare className="w-3 h-3" />
                            {todoCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-500">
                <Tag className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>No tags found</p>
              </div>
            )}
          </div>
        ) : activeView === "todos" ? (
          /* Todo Lists and Todo Tags Section */
          <div className="space-y-6">
            <div className="space-y-1.5">
              {/* Header */}
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Todo Lists</span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    ({todoLists.length})
                  </span>
                </span>
                <button
                  onClick={() => setIsCreatingTodoList(true)}
                  className="p-1 rounded-md hover:bg-white/[0.06] text-neutral-400 hover:text-white transition-colors"
                  title="Create New Todo List"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Create Todo List Form */}
              {isCreatingTodoList && (
                <div className="px-1 py-1">
                  <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.1] rounded-lg p-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400 ml-1 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="List name (e.g. Homework, Study)..."
                      value={newTodoListTitle}
                      onChange={(e) => setNewTodoListTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const trimmed = newTodoListTitle.trim();
                          if (trimmed && onCreateTodoList) {
                            const newId = await onCreateTodoList(trimmed);
                            if (newId && onSelectTodoList) onSelectTodoList(newId as number);
                            setNewTodoListTitle("");
                            setIsCreatingTodoList(false);
                          }
                        }
                        if (e.key === "Escape") {
                          setIsCreatingTodoList(false);
                          setNewTodoListTitle("");
                        }
                      }}
                      className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none px-1.5"
                    />
                    <button
                      onClick={async () => {
                        const trimmed = newTodoListTitle.trim();
                        if (trimmed && onCreateTodoList) {
                          const newId = await onCreateTodoList(trimmed);
                          if (newId && onSelectTodoList) onSelectTodoList(newId as number);
                          setNewTodoListTitle("");
                          setIsCreatingTodoList(false);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold shrink-0"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingTodoList(false);
                        setNewTodoListTitle("");
                      }}
                      className="p-1 rounded hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 text-[10px] shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Todo Lists Rows */}
              <div className="space-y-0.5">
                {todoLists.map((list) => {
                  const isCurrent =
                    list.id === activeTodoListId ||
                    (!activeTodoListId && list.id === todoLists[0]?.id);
                  const itemsInList = todos.filter(
                    (t) => t.list_id === list.id || (!t.list_id && list.id === todoLists[0]?.id)
                  );
                  const pendingCount = itemsInList.filter((t) => !t.completed).length;

                  return (
                    <div
                      key={list.id}
                      onClick={() => {
                        if (list.id && onSelectTodoList) {
                          onSelectTodoList(list.id);
                        }
                      }}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isCurrent
                          ? "bg-white/[0.1] text-white font-medium shadow-xs"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CheckSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isCurrent ? "text-indigo-400" : "text-neutral-500"
                          }`}
                        />
                        <span className="truncate">{list.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            isCurrent
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-white/[0.06] text-neutral-400"
                          }`}
                          title={`${pendingCount} pending`}
                        >
                          {pendingCount}
                        </span>

                        {todoLists.length > 1 && onDeleteTodoList && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (list.id) onDeleteTodoList(list.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.08] text-neutral-500 hover:text-rose-400 transition-opacity"
                            title={`Delete list "${list.title}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {todoLists.length === 0 && (
                <div className="py-8 text-center text-xs text-neutral-500">
                  <CheckSquare className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p>No todo lists found</p>
                  <button
                    onClick={() => setIsCreatingTodoList(true)}
                    className="mt-2 text-indigo-400 hover:underline text-[11px]"
                  >
                    + Create a list
                  </button>
                </div>
              )}
            </div>

            {/* Todo Tags */}
            {todoTags.length > 0 && (
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between px-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    <Tag className="w-3 h-3 text-neutral-400" />
                    <span>Todo Tags</span>
                    <span className="text-neutral-500 font-mono text-[10px] font-normal lowercase">
                      ({todoTags.length})
                    </span>
                  </div>

                  {selectedTag && (
                    <button
                      type="button"
                      onClick={() => onSelectTag(null)}
                      className="text-[11px] text-neutral-400 hover:text-white transition-colors underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 px-1">
                  {todoTags.map((tag) => {
                    const isSelected = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => onSelectTag(isSelected ? null : tag)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                          isSelected
                            ? "bg-white/[0.12] text-white border border-white/[0.2] font-medium shadow-xs"
                            : "bg-white/[0.03] border border-white/[0.06] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="text-neutral-500">#</span>
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Notes Folders + Files View (existing) */
          <div className="space-y-6">
            {/* Folders Section */}
            <div className="space-y-1.5">
          {/* Folders Section Header */}
          <div className="flex items-center justify-between px-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            <span className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-neutral-400" />
              <span>Folders</span>
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleCollapseAllFolders}
                disabled={!hasExpandedFolders}
                className={`p-1 rounded-md transition-colors flex items-center justify-center text-[10px] ${
                  hasExpandedFolders
                    ? "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                    : "text-neutral-600 opacity-40 cursor-default"
                }`}
                title={hasExpandedFolders ? "Collapse all folders" : "All folders collapsed"}
                aria-label="Collapse all folders"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 rounded-md hover:bg-white/[0.06] text-neutral-400 hover:text-white transition-colors flex items-center justify-center text-[10px]"
                title="Create New Folder"
                aria-label="Create New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline New Folder Creation Form */}
          {isCreatingFolder && (
            <div className="px-1 py-1">
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.1] rounded-lg p-1.5">
                <Folder className="w-3.5 h-3.5 text-neutral-400 ml-1 shrink-0" />
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
                  className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none px-1.5"
                />
                <button
                  onClick={handleAddFolderSubmit}
                  className="px-2 py-0.5 rounded bg-white/[0.1] hover:bg-white/[0.2] text-white text-[10px] font-semibold shrink-0"
                  title="Create (Enter)"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }}
                  className="p-1 rounded hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 text-[10px] shrink-0"
                  title="Cancel (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Folders List with Drag-and-Drop Drop Targets */}
          {folders.map((folderName) => {
            const isExpanded = Boolean(expandedFolders[folderName]);
            const folderNotes = filteredNotes.filter((n) => n.folder === folderName);
            const isDropTarget = dragOverFolder === folderName;
            const hasTagMatch = Boolean(selectedTag && folderNotes.length > 0);
            const isDimmedByTag = Boolean(selectedTag && folderNotes.length === 0);

            return (
              <div
                key={folderName}
                className={`rounded-lg transition-all ${
                  isDropTarget
                    ? "bg-white/[0.08] ring-1 ring-white/[0.2] shadow-sm"
                    : hasTagMatch
                    ? "bg-white/[0.03]"
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
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                    isDropTarget
                      ? "bg-white/[0.1] text-white"
                      : hasTagMatch
                      ? "bg-white/[0.05] text-white font-medium"
                      : isDimmedByTag
                      ? "opacity-40 hover:opacity-80 text-neutral-500"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
                        isExpanded ? "rotate-90 text-neutral-400" : "text-neutral-500"
                      }`}
                    />
                    {isExpanded || isDropTarget ? (
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-neutral-300" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    )}
                    <span className="truncate font-medium">{folderName}</span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      ({folderNotes.length})
                    </span>

                    {hasTagMatch && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.08] ml-1">
                        #{selectedTag}
                      </span>
                    )}

                    {isDropTarget && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.1] text-neutral-200 border border-white/[0.2] animate-pulse ml-auto mr-1">
                        Drop here
                      </span>
                    )}
                  </div>

                  {/* Folder Hover Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewNote(folderName);
                        setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
                      }}
                      className="p-1 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
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
                        className="p-1 rounded hover:bg-white/[0.08] text-neutral-500 hover:text-red-400 transition-colors"
                        title={`Delete folder "${folderName}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Indented Note Titles */}
                {isExpanded && (
                  <div className="pl-3 pr-1 space-y-1 mt-1 border-l border-white/[0.06] ml-4">
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
          </div>

          {/* Unfiled Notes Section */}
          {unfiledNotes.length > 0 && (() => {
            const unfiledHasTagMatch = Boolean(selectedTag && unfiledNotes.length > 0);
            const unfiledDimmed = Boolean(selectedTag && unfiledNotes.length === 0);

            return (
              <div
                className={`pt-1 transition-all ${
                  dragOverFolder === "__unfiled" ? "bg-white/[0.08] ring-1 ring-white/[0.2] rounded-lg" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverFolder !== "__unfiled") setDragOverFolder("__unfiled");
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverFolder === "__unfiled") setDragOverFolder(null);
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
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                    dragOverFolder === "__unfiled"
                      ? "bg-white/[0.1] text-white"
                      : unfiledHasTagMatch
                      ? "bg-white/[0.05] text-white font-medium"
                      : unfiledDimmed
                      ? "opacity-40 hover:opacity-80 text-neutral-500"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
                        Boolean(expandedFolders["__unfiled"]) ? "rotate-90 text-neutral-400" : "text-neutral-500"
                      }`}
                    />
                    <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate font-medium">Unfiled Notes</span>
                    <span className="text-[10px] font-mono text-neutral-500 font-normal">
                      ({unfiledNotes.length})
                    </span>
                    {unfiledHasTagMatch && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.08] ml-1">
                        #{selectedTag}
                      </span>
                    )}
                    {dragOverFolder === "__unfiled" && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.1] text-neutral-200 border border-white/[0.2] animate-pulse ml-auto mr-1">
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
                      className="p-1 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
                      title="Add unfiled note"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {Boolean(expandedFolders["__unfiled"]) && (
                  <div className="pl-3 pr-1 space-y-1 mt-1 border-l border-white/[0.06] ml-4">
                    {unfiledNotes.map(renderNoteRow)}
                  </div>
                )}
              </div>
            );
          })()}

          {filteredNotes.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500">
              <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>No notes found</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-white/[0.06] flex items-center justify-between bg-neutral-950 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenImport}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-neutral-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
            title="Import .md Files"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Import</span>
          </button>

          <button
            onClick={onExportAll}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-neutral-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
            title="Export All Notes (.md)"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>Export</span>
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-neutral-400 hover:text-neutral-200 transition-colors"
          title="App Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
