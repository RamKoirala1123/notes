"use client";

import React, { useState, useRef, useEffect } from "react";
import { Todo, TodoList } from "@/lib/types";
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
  Edit2,
  FileText,
  Folder,
  BookOpen,
  GraduationCap,
  ClipboardList,
  Check,
  X,
  GripVertical,
  AlignLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface TodoWorkspaceProps {
  todos: Todo[];
  todoLists: TodoList[];
  activeTodoListId: number | null;
  onSelectTodoList: (id: number) => void;
  onCreateTodoList: (title: string) => Promise<number | void>;
  onDeleteTodoList: (id: number) => Promise<void> | void;
  onRenameTodoList: (id: number, newTitle: string) => Promise<void> | void;
  selectedTag: string | null;
  searchQuery: string;
  onSelectTag: (tag: string | null) => void;
  onSwitchToNotes?: () => void;
}

export const TodoWorkspace: React.FC<TodoWorkspaceProps> = ({
  todos,
  todoLists,
  activeTodoListId,
  onSelectTodoList,
  onCreateTodoList,
  onDeleteTodoList,
  onRenameTodoList,
  selectedTag,
  searchQuery,
  onSelectTag,
  onSwitchToNotes,
}) => {
  // Quick Add state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showAddDetails, setShowAddDetails] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Tab Strip: New Todo List creation
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  // Rename active list
  const [isRenamingList, setIsRenamingList] = useState(false);
  const [renamingListTitle, setRenamingListTitle] = useState("");

  // Direct Inline Editing state (Triggered by Long Tap or Edit button — NO dialog!)
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingTagInput, setEditingTagInput] = useState("");

  // Drag and Drop state
  const [draggedTodoId, setDraggedTodoId] = useState<number | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<"before" | "after" | null>(null);

  // Press Detection (Short press to complete, Long press to directly edit inline)
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressFiredRef = useRef(false);
  const [longPressActiveId, setLongPressActiveId] = useState<number | null>(null);

  // Determine active list (fallback to first list)
  const activeList =
    todoLists.find((l) => l.id === activeTodoListId) ||
    (todoLists.length > 0 ? todoLists[0] : null);
  const effectiveListId = activeList?.id;

  // Extract all existing tags for suggestions
  const allExistingTags = Array.from(
    new Set(todos.flatMap((t) => t.tags || []))
  ).sort();

  // Filter todos belonging to the active list
  const listTodos = todos.filter((todo) => {
    if (effectiveListId) {
      return (
        todo.list_id === effectiveListId ||
        (!todo.list_id && effectiveListId === todoLists[0]?.id)
      );
    }
    return true;
  });

  // Sort todos by their order property (or creation time fallback)
  const sortedListTodos = [...listTodos].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Filter logic for current list
  const filteredTodos = sortedListTodos.filter((todo) => {
    const matchesSearch =
      !searchQuery.trim() ||
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.description && todo.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || (todo.tags && todo.tags.includes(selectedTag));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !todo.completed) ||
      (statusFilter === "completed" && todo.completed);

    const matchesPriority = priorityFilter === "all" || todo.priority === priorityFilter;

    return matchesSearch && matchesTag && matchesStatus && matchesPriority;
  });

  const completedCount = listTodos.filter((t) => t.completed).length;
  const totalCount = listTodos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  // Handle Quick Add Todo
  const handleAddTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    let targetListId = effectiveListId;
    if (!targetListId) {
      const createdId = await onCreateTodoList("Homework");
      if (typeof createdId === "number") targetListId = createdId;
    }

    const currentMaxOrder = listTodos.reduce((max, t) => Math.max(max, t.order ?? 0), -1);

    const newTodo: Omit<Todo, "id"> = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      completed: false,
      priority: newPriority,
      list_id: targetListId,
      order: currentMaxOrder + 1,
      due_date: newDueDate || undefined,
      tags: newTags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.todos.add(newTodo);
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNewTags([]);
    setTagInput("");
    setShowAddDetails(false);
  };

  const handleAddQuickTag = (tagToAdd?: string) => {
    const raw = (tagToAdd || tagInput).trim().replace(/^#/, "");
    if (raw && !newTags.includes(raw)) {
      setNewTags([...newTags, raw]);
      setTagInput("");
    }
  };

  const handleRemoveQuickTag = (tagToRemove: string) => {
    setNewTags(newTags.filter((t) => t !== tagToRemove));
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
    if (editingTodoId === id) {
      setEditingTodoId(null);
    }
  };

  const handleClearCompleted = async () => {
    const completedIds = listTodos.filter((t) => t.completed && t.id).map((t) => t.id!);
    const listName = activeList ? `"${activeList.title}"` : "this list";
    if (completedIds.length > 0 && confirm(`Clear ${completedIds.length} completed task(s) from ${listName}?`)) {
      await db.todos.bulkDelete(completedIds);
    }
  };

  // Direct Inline Edit Functions (NO modal dialog)
  const startInlineEdit = (todo: Todo) => {
    if (!todo.id) return;
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
    setEditingDescription(todo.description || "");
    setEditingTags(todo.tags || []);
    setEditingTagInput("");
    setLongPressActiveId(null);
  };

  const handleSaveInlineEdit = async (id: number) => {
    if (editingTitle.trim()) {
      await db.todos.update(id, {
        title: editingTitle.trim(),
        description: editingDescription.trim() || undefined,
        tags: editingTags,
        updated_at: new Date().toISOString(),
      });
    }
    setEditingTodoId(null);
  };

  // Press Logic: Short press to complete, Long press to directly edit inline
  const handlePointerDown = (e: React.PointerEvent, todo: Todo) => {
    // If card is already being edited inline, do not intercept
    if (editingTodoId === todo.id) return;
    if (e.button !== 0) return;

    // Ignore interactive sub-elements (checkbox, buttons, drag handle)
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest("[data-drag-handle]")
    ) {
      return;
    }

    isLongPressFiredRef.current = false;
    pressStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (todo.id) setLongPressActiveId(todo.id);

    // 450ms long press timer triggers inline edit directly!
    pressTimerRef.current = setTimeout(() => {
      isLongPressFiredRef.current = true;
      if (typeof window !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {}
      }
      startInlineEdit(todo);
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressStartPosRef.current) return;
    const dist = Math.hypot(
      e.clientX - pressStartPosRef.current.x,
      e.clientY - pressStartPosRef.current.y
    );
    // If pointer moved more than 8px, user is scrolling or dragging
    if (dist > 8) {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      setLongPressActiveId(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent, todo: Todo) => {
    if (editingTodoId === todo.id) return;

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    setLongPressActiveId(null);

    // If long press already fired, do not trigger short press
    if (isLongPressFiredRef.current) {
      isLongPressFiredRef.current = false;
      return;
    }

    // Short press triggered: toggle task complete!
    if (pressStartPosRef.current) {
      pressStartPosRef.current = null;
      handleToggleComplete(todo);
    }
  };

  const handlePointerCancel = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressStartPosRef.current = null;
    isLongPressFiredRef.current = false;
    setLongPressActiveId(null);
  };

  // Drag and Drop Reordering Handlers
  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    if (!todo.id) return;
    e.dataTransfer.setData("text/plain", String(todo.id));
    e.dataTransfer.effectAllowed = "move";
    setDraggedTodoId(todo.id);
  };

  const handleDragOver = (e: React.DragEvent, targetTodo: Todo) => {
    e.preventDefault();
    if (!targetTodo.id || draggedTodoId === targetTodo.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? "before" : "after";

    setDragOverTodoId(targetTodo.id);
    setDragPosition(pos);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverTodoId(null);
    setDragPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetTodo: Todo) => {
    e.preventDefault();
    if (!draggedTodoId || !targetTodo.id || draggedTodoId === targetTodo.id) {
      setDraggedTodoId(null);
      setDragOverTodoId(null);
      setDragPosition(null);
      return;
    }

    // Reorder the current list
    const currentOrdered = [...sortedListTodos];
    const fromIndex = currentOrdered.findIndex((t) => t.id === draggedTodoId);
    let toIndex = currentOrdered.findIndex((t) => t.id === targetTodo.id);

    if (fromIndex === -1 || toIndex === -1) return;

    const [movedItem] = currentOrdered.splice(fromIndex, 1);
    if (dragPosition === "after" && fromIndex < toIndex) {
      // already moved
    } else if (dragPosition === "after") {
      toIndex += 1;
    }
    currentOrdered.splice(toIndex, 0, movedItem);

    // Save new order to Dexie
    const updatePromises = currentOrdered.map((item, idx) => {
      if (item.id) {
        return db.todos.update(item.id, { order: idx });
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);

    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDragPosition(null);
  };

  const handleCreateListSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newListTitle.trim();
    if (!trimmed) return;
    const newId = await onCreateTodoList(trimmed);
    if (newId && typeof newId === "number") {
      onSelectTodoList(newId);
    }
    setNewListTitle("");
    setIsCreatingList(false);
  };

  const handleStartRename = () => {
    if (activeList) {
      setRenamingListTitle(activeList.title);
      setIsRenamingList(true);
    }
  };

  const handleSaveRename = async () => {
    if (activeList?.id && renamingListTitle.trim()) {
      await onRenameTodoList(activeList.id, renamingListTitle.trim());
    }
    setIsRenamingList(false);
  };

  // Helper icon for lists
  const getListIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("homework") || lower.includes("assignment")) {
      return <ClipboardList className="w-3.5 h-3.5" />;
    }
    if (lower.includes("study") || lower.includes("exam") || lower.includes("read")) {
      return <GraduationCap className="w-3.5 h-3.5" />;
    }
    if (lower.includes("book") || lower.includes("chapter")) {
      return <BookOpen className="w-3.5 h-3.5" />;
    }
    return <CheckSquare className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* 1. Sleek Tab Strip for Todo Lists */}
      <div className="border-b border-white/[0.06] bg-neutral-950 px-4 pt-2 hidden md:flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {todoLists.map((list) => {
            const isCurrent = list.id === effectiveListId;
            const itemsInList = todos.filter(
              (t) => t.list_id === list.id || (!t.list_id && list.id === todoLists[0]?.id)
            );
            const pendingInList = itemsInList.filter((t) => !t.completed).length;

            return (
              <div
                key={list.id}
                onClick={() => list.id && onSelectTodoList(list.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer text-xs font-medium transition-all select-none border-t border-x ${
                  isCurrent
                    ? "bg-neutral-900/90 text-white border-white/[0.08] shadow-xs border-b-neutral-900 -mb-px z-10 font-semibold"
                    : "bg-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] border-transparent"
                }`}
              >
                <span className={isCurrent ? "text-indigo-400" : "text-neutral-500"}>
                  {getListIcon(list.title)}
                </span>
                <span className="truncate max-w-[120px]">{list.title}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono transition-colors ${
                    isCurrent
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-white/[0.06] text-neutral-400"
                  }`}
                >
                  {pendingInList}
                </span>

                {/* Delete list button on tab hover if > 1 list */}
                {todoLists.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (list.id) onDeleteTodoList(list.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/[0.08] text-neutral-500 hover:text-rose-400 transition-opacity ml-0.5"
                    title={`Delete list "${list.title}"`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* "+ New List" Tab Button or Inline Input */}
          {isCreatingList ? (
            <form
              onSubmit={handleCreateListSubmit}
              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-indigo-500/50 rounded-t-lg -mb-px z-10"
            >
              <input
                type="text"
                autoFocus
                placeholder="New list name..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsCreatingList(false);
                    setNewListTitle("");
                  }
                }}
                className="w-32 bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none px-1"
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingList(false);
                  setNewListTitle("");
                }}
                className="p-0.5 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingList(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] transition-colors -mb-px select-none"
              title="Create new Todo List"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">New List</span>
            </button>
          )}
        </div>

        {/* Clear Completed action on top right if completed > 0 */}
        {completedCount > 0 && (
          <button
            onClick={handleClearCompleted}
            className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors pb-1 flex items-center gap-1"
            title="Clear completed tasks in this list"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Completed ({completedCount})</span>
          </button>
        )}
      </div>

      {/* 2. Clean Compact Header + Filter Bar (Single clean bar — NO description paragraph!) */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Simple Title + Mini Progress Pill */}
        <div className="flex items-center gap-3">
          {isRenamingList ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={renamingListTitle}
                onChange={(e) => setRenamingListTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") setIsRenamingList(false);
                }}
                className="bg-neutral-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none"
              />
              <button
                onClick={handleSaveRename}
                className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsRenamingList(false)}
                className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span className="text-indigo-400">
                  {activeList ? getListIcon(activeList.title) : <CheckSquare className="w-4 h-4" />}
                </span>
                <span>{activeList ? activeList.title : "Tasks"}</span>
              </h2>

              {activeList && (
                <button
                  onClick={handleStartRename}
                  className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.06] transition-colors"
                  title="Rename list"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Simple Progress Pill */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08] text-[11px] text-neutral-400">
              <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-neutral-400">
                {completedCount}/{totalCount} ({progressPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* Filter Pills (All / Pending / Done) & Active Tag / Priority */}
        <div className="flex items-center gap-2 text-xs">
          {/* Status Filter Segmented Control */}
          <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-white/[0.1] text-white shadow-xs font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All ({listTodos.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "pending"
                  ? "bg-white/[0.1] text-white shadow-xs font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Pending ({listTodos.filter((t) => !t.completed).length})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "completed"
                  ? "bg-white/[0.1] text-white shadow-xs font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Done ({completedCount})
            </button>
          </div>

          {/* Active Tag Filter Pill */}
          {selectedTag && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
              <span>#{selectedTag}</span>
              <button
                onClick={() => onSelectTag(null)}
                className="hover:text-rose-400 ml-0.5"
                title="Clear tag filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Priority dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-neutral-900 border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 focus:outline-none"
          >
            <option value="all">Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* 3. Sleek Quick Add Input Bar */}
      <div className="px-5 py-2.5 bg-neutral-950 border-b border-white/[0.06] shrink-0">
        <form onSubmit={handleAddTodo} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Add task to "${activeList?.title || "Tasks"}"... (Enter to add)`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-neutral-950 border border-white/[0.08] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none transition-all"
          />

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
            className="bg-neutral-900 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-neutral-400 focus:outline-none hidden sm:block"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="bg-neutral-900 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-neutral-400 focus:outline-none hidden md:block"
          />

          <button
            type="button"
            onClick={() => setShowAddDetails((prev) => !prev)}
            className={`p-2 rounded-xl border transition-colors flex items-center justify-center text-xs ${
              showAddDetails || newDescription || newTags.length > 0
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white"
            }`}
            title="Add description & tags"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* Collapsible Details: Description and Tags */}
        {showAddDetails && (
          <div className="mt-2 p-2.5 bg-neutral-900/60 border border-white/[0.06] rounded-xl space-y-2">
            <input
              type="text"
              placeholder="Description or notes (optional)..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-all"
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <TagIcon className="w-3 h-3 text-indigo-400" />
                <span>Tags:</span>
              </span>

              {newTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px]"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuickTag(tag)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddQuickTag();
                    }
                  }}
                  className="bg-neutral-950 border border-white/[0.08] rounded-md px-2 py-0.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none w-28"
                />
                <button
                  type="button"
                  onClick={() => handleAddQuickTag()}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                >
                  Add
                </button>
              </div>

              {allExistingTags.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-neutral-500 pl-2">
                  <span>Suggestions:</span>
                  {allExistingTags.slice(0, 4).map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => handleAddQuickTag(suggested)}
                      className="px-1.5 py-0.2 rounded bg-neutral-950 border border-white/[0.06] text-neutral-400 hover:text-indigo-300 text-[10px]"
                    >
                      #{suggested}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Todo Items List with Drag-and-Drop and Press Gestures */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
        {filteredTodos.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500">
            <CheckCircle2 className="w-9 h-9 mx-auto mb-2 opacity-30 text-indigo-400" />
            <p className="font-semibold text-neutral-400">No tasks found</p>
            <p className="text-[11px] mt-1">
              Add a new task above or select another filter for &quot;{activeList?.title || "this list"}&quot;.
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isDragging = draggedTodoId === todo.id;
            const isDropTarget = dragOverTodoId === todo.id;
            const isPressActive = longPressActiveId === todo.id;
            const isEditingThis = editingTodoId === todo.id;

            const priorityBadge = {
              high: "bg-rose-950/60 border-rose-800/60 text-rose-300",
              medium: "bg-amber-950/60 border-amber-800/60 text-amber-300",
              low: "bg-blue-950/60 border-blue-800/60 text-blue-300",
            }[todo.priority];

            return (
              <div
                key={todo.id}
                onPointerDown={(e) => handlePointerDown(e, todo)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, todo)}
                onPointerCancel={handlePointerCancel}
                onDragOver={(e) => handleDragOver(e, todo)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, todo)}
                className={`group relative p-3 rounded-xl border transition-all select-none ${
                  isEditingThis ? "cursor-default ring-1 ring-indigo-500/50" : "cursor-pointer"
                } ${
                  todo.completed
                    ? "bg-neutral-950/40 border-white/[0.04] opacity-55"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] shadow-xs"
                } ${isDragging ? "opacity-30 border-dashed border-indigo-500" : ""} ${
                  isDropTarget && dragPosition === "before"
                    ? "border-t-2 border-t-indigo-500"
                    : ""
                } ${
                  isDropTarget && dragPosition === "after"
                    ? "border-b-2 border-b-indigo-500"
                    : ""
                } ${isPressActive ? "scale-[0.99] ring-2 ring-indigo-500/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Drag Handle & Checkbox & Content */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Drag Handle */}
                    <div
                      data-drag-handle
                      draggable
                      onDragStart={(e) => handleDragStart(e, todo)}
                      className="cursor-grab active:cursor-grabbing p-1 text-neutral-600 hover:text-neutral-300 transition-colors mt-0.5 shrink-0"
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(todo);
                      }}
                      className="p-1 text-neutral-400 hover:text-indigo-400 transition-colors mt-0.5 shrink-0"
                      title={todo.completed ? "Mark as pending" : "Mark as completed"}
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400" />
                      )}
                    </button>

                    {/* Title, Description & Tags (Direct Inline Edit on Long Tap) */}
                    {isEditingThis ? (
                      <div className="flex-1 min-w-0 pr-2 space-y-2">
                        {/* Inline Title Input */}
                        <input
                          type="text"
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (todo.id) handleSaveInlineEdit(todo.id);
                            }
                            if (e.key === "Escape") {
                              setEditingTodoId(null);
                            }
                          }}
                          placeholder="Task title..."
                          className="w-full bg-neutral-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        />

                        {/* Inline Description Input */}
                        <input
                          type="text"
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (todo.id) handleSaveInlineEdit(todo.id);
                            }
                            if (e.key === "Escape") {
                              setEditingTodoId(null);
                            }
                          }}
                          placeholder="Description / notes (optional)..."
                          className="w-full bg-neutral-950 border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                        />

                        {/* Inline Tags Row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {editingTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]"
                            >
                              <span>#{tag}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTags(editingTags.filter((t) => t !== tag));
                                }}
                                className="hover:text-rose-400"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder="+ tag (Enter)..."
                            value={editingTagInput}
                            onChange={(e) => setEditingTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                const raw = editingTagInput.trim().replace(/^#/, "");
                                if (raw && !editingTags.includes(raw)) {
                                  setEditingTags([...editingTags, raw]);
                                  setEditingTagInput("");
                                }
                              }
                            }}
                            className="w-24 bg-neutral-950 border border-white/[0.08] rounded px-2 py-0.5 text-[10px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Inline Controls */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (todo.id) handleSaveInlineEdit(todo.id);
                            }}
                            className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTodoId(null);
                            }}
                            className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] transition-colors"
                          >
                            Cancel
                          </button>
                          <span className="text-[10px] text-neutral-500">
                            Enter to save • Esc to cancel
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 pr-2">
                        <h3
                          className={`text-xs font-medium leading-relaxed break-words ${
                            todo.completed
                              ? "line-through text-neutral-500"
                              : "text-neutral-200"
                          }`}
                        >
                          {todo.title}
                        </h3>

                        {/* Description / Notes (only if present) */}
                        {todo.description && (
                          <p
                            className={`text-[11px] mt-0.5 line-clamp-2 leading-normal ${
                              todo.completed ? "text-neutral-600" : "text-neutral-400"
                            }`}
                          >
                            {todo.description}
                          </p>
                        )}

                        {/* Tag Chips on Card */}
                        {todo.tags && todo.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {todo.tags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTag(selectedTag === tag ? null : tag);
                                }}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] transition-all ${
                                  selectedTag === tag
                                    ? "bg-indigo-600 text-white font-medium"
                                    : "bg-white/[0.04] text-neutral-400 hover:text-neutral-200 border border-white/[0.06]"
                                }`}
                                title={`Filter by #${tag}`}
                              >
                                <span>#{tag}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badges & Actions */}
                  {!isEditingThis && (
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {/* Priority Badge */}
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${priorityBadge}`}
                      >
                        {todo.priority}
                      </span>

                      {/* Due Date Badge */}
                      {todo.due_date && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-neutral-900 border border-white/[0.06] text-[10px] text-neutral-400">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          {todo.due_date}
                        </span>
                      )}

                      {/* Direct Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startInlineEdit(todo);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 transition-all"
                        title="Edit text directly (Long press also works)"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (todo.id) handleDeleteTodo(todo.id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] text-neutral-500 hover:text-rose-400 transition-all"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
