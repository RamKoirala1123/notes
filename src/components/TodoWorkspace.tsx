"use client";

import React, { useState } from "react";
import { Todo } from "@/lib/types";
import { db } from "@/lib/db";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  Tag as TagIcon,
  Sparkles,
  Edit2
} from "lucide-react";

interface TodoWorkspaceProps {
  todos: Todo[];
  selectedTag: string | null;
  searchQuery: string;
  onSelectTag: (tag: string | null) => void;
}

export const TodoWorkspace: React.FC<TodoWorkspaceProps> = ({
  todos,
  selectedTag,
  searchQuery,
  onSelectTag,
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleAddTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const newTodo: Omit<Todo, "id"> = {
      title: newTitle.trim(),
      completed: false,
      priority: newPriority,
      due_date: newDueDate || undefined,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.todos.add(newTodo);
    setNewTitle("");
    setNewDueDate("");
  };

  const handleToggleComplete = async (todo: Todo) => {
    if (todo.id) {
      await db.todos.update(todo.id, {
        completed: !todo.completed,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleDeleteTodo = async (id: number) => {
    await db.todos.delete(id);
  };

  const handleClearCompleted = async () => {
    const completedIds = todos.filter((t) => t.completed && t.id).map((t) => t.id!);
    if (completedIds.length > 0 && confirm(`Clear ${completedIds.length} completed task(s)?`)) {
      await db.todos.bulkDelete(completedIds);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (editingTitle.trim()) {
      await db.todos.update(id, {
        title: editingTitle.trim(),
        updated_at: new Date().toISOString(),
      });
    }
    setEditingTodoId(null);
  };

  // Filter logic
  const filteredTodos = todos.filter((todo) => {
    const matchesSearch =
      !searchQuery.trim() || todo.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || todo.tags.includes(selectedTag);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !todo.completed) ||
      (statusFilter === "completed" && todo.completed);

    const matchesPriority = priorityFilter === "all" || todo.priority === priorityFilter;

    return matchesSearch && matchesTag && matchesStatus && matchesPriority;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Header & Progress Bar */}
      <div className="p-6 border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-indigo-400" />
              <span>Todo Tasks</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Manage your actionable tasks and check list items locally
            </p>
          </div>

          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                onClick={handleClearCompleted}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs font-semibold transition-colors"
              >
                Clear Completed ({completedCount})
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-neutral-400 font-medium">
              <span>Progress</span>
              <span>
                {completedCount} of {totalCount} completed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Bar */}
      <div className="p-4 bg-neutral-900/80 border-b border-neutral-800/80">
        <form onSubmit={handleAddTodo} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Add a new task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[220px] bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-all"
          />

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-300 focus:outline-none"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>

          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-300 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </form>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="px-6 py-3 bg-neutral-950 border-b border-neutral-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === "all" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            All ({todos.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === "pending" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Pending ({todos.filter((t) => !t.completed).length})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === "completed" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 text-neutral-400">
          <Filter className="w-3.5 h-3.5" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Todo Items List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {filteredTodos.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
            <p className="font-semibold text-neutral-400">No tasks found</p>
            <p className="text-[11px] mt-1">Add a new task above or change active filters.</p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isEditing = editingTodoId === todo.id;

            const priorityBadge = {
              high: "bg-rose-950/60 border-rose-800/60 text-rose-300",
              medium: "bg-amber-950/60 border-amber-800/60 text-amber-300",
              low: "bg-blue-950/60 border-blue-800/60 text-blue-300",
            }[todo.priority];

            return (
              <div
                key={todo.id}
                className={`group p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  todo.completed
                    ? "bg-neutral-950/50 border-neutral-900 opacity-60"
                    : "bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-900 hover:border-neutral-700 shadow-md"
                }`}
              >
                {/* Checkbox & Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(todo)}
                    className="p-1 text-neutral-400 hover:text-indigo-400 transition-colors shrink-0"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-neutral-500 group-hover:text-indigo-400" />
                    )}
                  </button>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && todo.id) handleSaveEdit(todo.id);
                      }}
                      onBlur={() => {
                        if (todo.id) handleSaveEdit(todo.id);
                      }}
                      autoFocus
                      className="flex-1 bg-neutral-950 border border-indigo-500 rounded px-2 py-1 text-xs text-neutral-100 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => {
                        if (todo.id) {
                          setEditingTodoId(todo.id);
                          setEditingTitle(todo.title);
                        }
                      }}
                      className={`text-xs font-medium truncate cursor-pointer ${
                        todo.completed ? "line-through text-neutral-500" : "text-neutral-200"
                      }`}
                    >
                      {todo.title}
                    </span>
                  )}
                </div>

                {/* Badges & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Priority Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityBadge}`}
                  >
                    {todo.priority}
                  </span>

                  {/* Due Date Badge */}
                  {todo.due_date && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      {todo.due_date}
                    </span>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (todo.id) handleDeleteTodo(todo.id);
                    }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-all"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
