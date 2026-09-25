"use client";

import React, { useState } from "react";
import { Note, Todo, TodoList } from "@/lib/types";
import {
  Tag as TagIcon,
  FileText,
  CheckSquare,
  Search,
  ChevronRight,
  Clock,
  ArrowUpRight,
  X,
} from "lucide-react";

interface TagWorkspaceProps {
  notes: Note[];
  todos: Todo[];
  todoLists: TodoList[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onSelectNote: (note: Note) => void;
  onSelectTodoList: (id: number) => void;
  onSwitchToNotes: () => void;
  onSwitchToTodos: () => void;
}

export const TagWorkspace: React.FC<TagWorkspaceProps> = ({
  notes,
  todos,
  todoLists,
  selectedTag,
  onSelectTag,
  onSelectNote,
  onSelectTodoList,
  onSwitchToNotes,
  onSwitchToTodos,
}) => {
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "notes" | "todos">("all");

  // Collect tag stats across Notes and Todos
  const noteTagCounts: Record<string, number> = {};
  notes.forEach((n) => {
    (n.tags || []).forEach((t) => {
      noteTagCounts[t] = (noteTagCounts[t] || 0) + 1;
    });
  });

  const todoTagCounts: Record<string, number> = {};
  todos.forEach((t) => {
    (t.tags || []).forEach((tag) => {
      todoTagCounts[tag] = (todoTagCounts[tag] || 0) + 1;
    });
  });

  const allTagNames = Array.from(
    new Set([...Object.keys(noteTagCounts), ...Object.keys(todoTagCounts)])
  ).sort();

  // Filtered tags based on search query and category filter
  const filteredTagNames = allTagNames.filter((tag) => {
    const matchesSearch = tag.toLowerCase().includes(tagSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterCategory === "notes") return (noteTagCounts[tag] || 0) > 0;
    if (filterCategory === "todos") return (todoTagCounts[tag] || 0) > 0;
    return true;
  });

  // Notes and todos for selected tag
  const matchingNotes = selectedTag
    ? notes.filter((n) => (n.tags || []).includes(selectedTag))
    : [];
  const matchingTodos = selectedTag
    ? todos.filter((t) => (t.tags || []).includes(selectedTag))
    : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden text-neutral-200">
      {/* Header Banner */}
      <div className="px-6 py-5 border-b border-white/[0.06] bg-neutral-900/40 backdrop-blur-xl shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white tracking-tight">
                  {selectedTag ? `#${selectedTag}` : "Tags Explorer"}
                </h1>
                {selectedTag && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Active Filter
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {selectedTag
                  ? `Showing content tagged with #${selectedTag} (${matchingNotes.length} notes, ${matchingTodos.length} todos)`
                  : `Browse and manage content across ${allTagNames.length} unique tags`}
              </p>
            </div>
          </div>

          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        {/* Filter Controls & Search */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
          {/* Tag Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tags..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-9 pr-8 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
            {tagSearchQuery && (
              <button
                onClick={() => setTagSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pill Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                filterCategory === "all"
                  ? "bg-white/[0.12] text-white font-medium shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All ({allTagNames.length})
            </button>
            <button
              onClick={() => setFilterCategory("notes")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                filterCategory === "notes"
                  ? "bg-white/[0.12] text-white font-medium shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Notes ({Object.keys(noteTagCounts).length})
            </button>
            <button
              onClick={() => setFilterCategory("todos")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                filterCategory === "todos"
                  ? "bg-white/[0.12] text-white font-medium shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Todos ({Object.keys(todoTagCounts).length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {selectedTag ? (
          /* Detailed View for Selected Tag */
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Matching Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Notes tagged with #{selectedTag}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/[0.06] text-neutral-400">
                    {matchingNotes.length}
                  </span>
                </div>
                {matchingNotes.length > 0 && (
                  <button
                    onClick={() => {
                      onSelectNote(matchingNotes[0]);
                      onSwitchToNotes();
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
                  >
                    <span>View in Notes</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {matchingNotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matchingNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => {
                        onSelectNote(note);
                        onSwitchToNotes();
                      }}
                      className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.15] cursor-pointer transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="font-semibold text-sm text-neutral-200 group-hover:text-white transition-colors truncate">
                            {note.title || "Untitled Note"}
                          </h3>
                          {note.folder && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-neutral-400 font-mono shrink-0">
                              📁 {note.folder}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                          {note.content.replace(/[#*`_]/g, "").slice(0, 120) || "No preview available..."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {note.tags.map((t) => (
                            <span
                              key={t}
                              className={`px-1.5 py-0.2 rounded text-[10px] ${
                                t === selectedTag
                                  ? "bg-amber-500/20 text-amber-300 font-semibold"
                                  : "bg-white/[0.04] text-neutral-400"
                              }`}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-xl text-xs text-neutral-500">
                  No notes found with #{selectedTag}
                </div>
              )}
            </div>

            {/* Matching Todos Section */}
            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>Todos tagged with #{selectedTag}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/[0.06] text-neutral-400">
                    {matchingTodos.length}
                  </span>
                </div>
                {matchingTodos.length > 0 && (
                  <button
                    onClick={() => {
                      if (matchingTodos[0].list_id) {
                        onSelectTodoList(matchingTodos[0].list_id);
                      }
                      onSwitchToTodos();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <span>View in Todos</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {matchingTodos.length > 0 ? (
                <div className="space-y-2">
                  {matchingTodos.map((todo) => {
                    const list = todoLists.find((l) => l.id === todo.list_id);
                    return (
                      <div
                        key={todo.id}
                        onClick={() => {
                          if (todo.list_id) onSelectTodoList(todo.list_id);
                          onSwitchToTodos();
                        }}
                        className="group p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] cursor-pointer transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                              todo.completed
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "border-neutral-700"
                            }`}
                          >
                            {todo.completed && "✓"}
                          </span>
                          <div className="min-w-0">
                            <span
                              className={`text-xs block truncate ${
                                todo.completed ? "line-through text-neutral-500" : "text-neutral-200"
                              }`}
                            >
                              {todo.title}
                            </span>
                            {list && (
                              <span className="text-[10px] text-neutral-500">
                                in list: {list.title}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {todo.priority && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                                todo.priority === "high"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : todo.priority === "medium"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-white/[0.06] text-neutral-400"
                              }`}
                            >
                              {todo.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-xl text-xs text-neutral-500">
                  No todos found with #{selectedTag}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tag Overview Grid */
          <div className="max-w-6xl mx-auto space-y-6">
            {filteredTagNames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredTagNames.map((tag) => {
                  const nNotes = noteTagCounts[tag] || 0;
                  const nTodos = todoTagCounts[tag] || 0;
                  const total = nNotes + nTodos;

                  return (
                    <div
                      key={tag}
                      onClick={() => onSelectTag(tag)}
                      className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-500/30 cursor-pointer transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-semibold text-sm">#</span>
                            <span className="font-semibold text-sm text-neutral-100 group-hover:text-amber-300 transition-colors">
                              {tag}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 text-xs font-mono">
                            {total}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-2">
                          {nNotes > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-sky-400" />
                              <span>{nNotes} {nNotes === 1 ? "note" : "notes"}</span>
                            </span>
                          )}
                          {nNotes > 0 && nTodos > 0 && <span>•</span>}
                          {nTodos > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-indigo-400" />
                              <span>{nTodos} {nTodos === 1 ? "todo" : "todos"}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-neutral-500 group-hover:text-amber-400 transition-colors">
                        <span>Explore content</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-neutral-500 space-y-3">
                <TagIcon className="w-10 h-10 mx-auto opacity-20" />
                <p className="text-sm">No tags match your search query.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
