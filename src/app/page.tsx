"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureSeeded } from "@/lib/db";
import { Note } from "@/lib/types";
import { generateSlug, generateUniqueSlug, formatNoteToMarkdown, downloadFile } from "@/lib/markdown";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { TodoWorkspace } from "@/components/TodoWorkspace";
import { PublishModal } from "@/components/PublishModal";
import { ImportModal } from "@/components/ImportModal";
import { SettingsModal } from "@/components/SettingsModal";
import { QuickSearchModal } from "@/components/QuickSearchModal";
import { Menu, Sparkles } from "lucide-react";

export default function HomePage() {
  const [activeView, setActiveView] = useState<"notes" | "todos">("notes");
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Editor View Mode state (edit, split, preview)
  const [editorViewMode, setEditorViewMode] = useState<"split" | "edit" | "preview">("split");
  const previousEditModeRef = useRef<"split" | "edit">("split");

  // Modals state
  const [publishModalNote, setPublishModalNote] = useState<Note | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  };

  // Seed DB on mount if empty
  useEffect(() => {
    ensureSeeded();
  }, []);

  // Fetch live notes & todos from IndexedDB
  const notes = useLiveQuery(() => db.notes.orderBy("updated_at").reverse().toArray(), []) || [];
  const todos = useLiveQuery(() => db.todos.orderBy("updated_at").reverse().toArray(), []) || [];

  // Set initial active note
  useEffect(() => {
    if (notes.length > 0 && activeNoteId === null) {
      setActiveNoteId(notes[0].id || null);
    }
  }, [notes]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];
  const pendingTodosCount = todos.filter((t) => !t.completed).length;

  // Folders state
  const defaultFolders = ["Work", "Home"];
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mynotes_folders");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultFolders;
  });

  const allFolderNames = Array.from(
    new Set([
      ...customFolders,
      ...notes.map((n) => n.folder).filter((f): f is string => Boolean(f && f.trim())),
    ])
  ).sort();

  const handleCreateFolder = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customFolders.includes(trimmed)) {
      const updated = [...customFolders, trimmed];
      setCustomFolders(updated);
      try {
        localStorage.setItem("mynotes_folders", JSON.stringify(updated));
      } catch {}
    }
    showToast(`Folder "${trimmed}" created!`);
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (confirm(`Delete folder "${folderName}"? Notes inside will become unfiled.`)) {
      const notesInFolder = notes.filter((n) => n.folder === folderName);
      for (const note of notesInFolder) {
        if (note.id) {
          await db.notes.update(note.id, { folder: undefined });
        }
      }
      const updated = customFolders.filter((f) => f !== folderName);
      setCustomFolders(updated);
      try {
        localStorage.setItem("mynotes_folders", JSON.stringify(updated));
      } catch {}
      showToast(`Folder "${folderName}" deleted`);
    }
  };

  const handleMoveNoteToFolder = async (noteId: number, folder: string | undefined) => {
    await db.notes.update(noteId, {
      folder: folder || undefined,
      updated_at: new Date().toISOString(),
    });
    showToast(folder ? `Moved to "${folder}"` : "Removed from folder");
  };

  const handleCreateNewNote = async (customTitle?: string, folder?: string) => {
    try {
      const allNotes = await db.notes.toArray();
      const existingSlugs = allNotes.map((n) => n.slug);
      const count = allNotes.length + 1;
      const title = customTitle?.trim() || `Untitled Note ${count}`;
      const slug = generateUniqueSlug(title, existingSlugs);

      const newNote: Omit<Note, "id"> = {
        title,
        slug,
        content: `# ${title}\n\nStart writing markdown content here...`,
        tags: ["new"],
        folder: folder || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_published: false,
      };

      const id = await db.notes.add(newNote);
      setActiveNoteId(id);
      setActiveView("notes");
      setIsMobileOpen(false);
      showToast(folder ? `New note in "${folder}"! (⌘N)` : "New note created! (⌘N)");
    } catch (err) {
      console.error("Failed to create note:", err);
      showToast("Error creating note. Please try again.");
    }
  };

  const handleTogglePreview = () => {
    if (activeView !== "notes") {
      setActiveView("notes");
    }
    setEditorViewMode((current) => {
      const nextMode = current === "preview" ? "split" : "preview";
      showToast(nextMode === "preview" ? "Switched to Preview mode (Ctrl+P)" : "Switched to Split mode (Ctrl+P)");
      return nextMode;
    });
  };

  // Global Keyboard Shortcuts (⌘K, /, ⌘N, ⌘S, ⌘P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.metaKey || e.ctrlKey;

      // 1. Quick Search: ⌘ + K / Ctrl + K
      if (isModifier && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        setIsQuickSearchOpen((prev) => !prev);
        return;
      }

      // 1b. Quick Search: / (when not focused on editable fields)
      if (e.key === "/" && !isModifier && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable ||
            target.closest("[contenteditable='true']"));

        if (!isInput) {
          e.preventDefault();
          setIsQuickSearchOpen(true);
          return;
        }
      }

      // 2. Create New Note: ⌘ + N / Ctrl + N (and Alt + N)
      if ((isModifier || e.altKey) && (e.key.toLowerCase() === "n" || e.code === "KeyN")) {
        e.preventDefault();
        handleCreateNewNote();
        return;
      }

      // 3. Save Note: ⌘ + S / Ctrl + S (Global preventDefault & fallback)
      if (isModifier && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        if (activeView === "todos") {
          showToast("Todos are saved automatically");
        } else if (!activeNote) {
          showToast("No active note to save");
        }
        return;
      }

      // 4. Preview Mode Toggle: ⌘ + P / Ctrl + P (Switch between split mode and preview mode)
      if (isModifier && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
        e.preventDefault();
        e.stopPropagation();
        handleTogglePreview();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [notes, activeNote, activeView]);

  const handleSaveNote = async (updatedNote: Note) => {
    if (updatedNote.id) {
      await db.notes.put(updatedNote);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      await db.notes.delete(id);
      if (activeNoteId === id) {
        const remaining = notes.filter((n) => n.id !== id);
        setActiveNoteId(remaining.length > 0 ? remaining[0].id || null : null);
      }
    }
  };

  const handleTogglePublish = async (noteId: number, isPublished: boolean) => {
    await db.notes.update(noteId, {
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : undefined,
    });

    if (publishModalNote && publishModalNote.id === noteId) {
      setPublishModalNote({ ...publishModalNote, is_published: isPublished });
    }
  };

  const handleBatchImport = async (importedNotes: Omit<Note, "id">[]) => {
    try {
      const allNotes = await db.notes.toArray();
      const existingSlugs = new Set(allNotes.map((n) => n.slug));
      const sanitized = importedNotes.map((n) => {
        let slug = n.slug;
        let counter = 1;
        while (existingSlugs.has(slug)) {
          counter++;
          slug = `${n.slug}-${counter}`;
        }
        existingSlugs.add(slug);
        return { ...n, slug };
      });
      await db.notes.bulkAdd(sanitized);
    } catch (err) {
      console.error("Failed to batch import notes:", err);
      showToast("Error importing notes.");
    }
  };

  const handleExportAll = () => {
    notes.forEach((note) => {
      const content = formatNoteToMarkdown(note);
      downloadFile(`${note.slug}.md`, content);
    });
  };

  const availableTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans text-neutral-100">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar Component */}
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={(note) => {
          if (note.id) setActiveNoteId(note.id);
          setActiveView("notes");
          setIsMobileOpen(false);
        }}
        onNewNote={(folder) => handleCreateNewNote(undefined, folder)}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onExportAll={handleExportAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDeleteNote={handleDeleteNote}
        onMoveNoteToFolder={handleMoveNoteToFolder}
        isMobileOpen={isMobileOpen}
        onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
        activeView={activeView}
        onChangeView={setActiveView}
        pendingTodosCount={pendingTodosCount}
        folders={allFolderNames}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* Main Workspace (Notes or Todos) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeView === "todos" ? (
          <TodoWorkspace
            todos={todos}
            selectedTag={selectedTag}
            searchQuery={searchQuery}
            onSelectTag={setSelectedTag}
          />
        ) : activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            availableTags={availableTags}
            folders={allFolderNames}
            viewMode={editorViewMode}
            onViewModeChange={setEditorViewMode}
            onSave={handleSaveNote}
            onOpenPublish={(note) => setPublishModalNote(note)}
            onShowToast={showToast}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <h2 className="text-xl font-bold mb-2 text-neutral-300">No Notes Available</h2>
            <p className="text-xs mb-4">Create your first note or import markdown files to get started.</p>
            <button
              onClick={() => handleCreateNewNote()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30"
            >
              Create New Note
            </button>
          </div>
        )}
      </main>

      {/* Quick Search / Command Palette Modal (⌘K or /) */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        notes={notes}
        activeNote={activeNote || null}
        onSelectNote={(note) => {
          if (note.id) setActiveNoteId(note.id);
          setActiveView("notes");
          setIsMobileOpen(false);
        }}
        onCreateNewNote={handleCreateNewNote}
        onTogglePreview={handleTogglePreview}
        onSaveCurrentNote={() => {
          if (activeNote) {
            handleSaveNote(activeNote);
            showToast("Note saved! (⌘S)");
          }
        }}
        onChangeView={(view) => {
          setActiveView(view);
          setIsMobileOpen(false);
        }}
        onOpenImport={() => setIsImportOpen(true)}
        onExportAll={handleExportAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Modals */}
      {publishModalNote && (
        <PublishModal
          note={publishModalNote}
          isOpen={!!publishModalNote}
          onClose={() => setPublishModalNote(null)}
          onTogglePublish={handleTogglePublish}
        />
      )}

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onBatchImport={handleBatchImport}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetComplete={() => {
          setActiveNoteId(null);
        }}
      />

      {/* Toast Notification Pill */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-neutral-900/95 border border-indigo-500/40 text-neutral-100 text-xs font-semibold shadow-2xl shadow-indigo-950/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}