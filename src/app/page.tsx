"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureSeeded } from "@/lib/db";
import { Note } from "@/lib/types";
import { generateSlug, formatNoteToMarkdown, downloadFile } from "@/lib/markdown";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { TodoWorkspace } from "@/components/TodoWorkspace";
import { PublishModal } from "@/components/PublishModal";
import { ImportModal } from "@/components/ImportModal";
import { SettingsModal } from "@/components/SettingsModal";
import { Menu } from "lucide-react";

export default function HomePage() {
  const [activeView, setActiveView] = useState<"notes" | "todos">("notes");
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Modals state
  const [publishModalNote, setPublishModalNote] = useState<Note | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleCreateNewNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notes]);

  const handleCreateNewNote = async () => {
    const count = notes.length + 1;
    const title = `Untitled Note ${count}`;
    const slug = generateSlug(title);

    const newNote: Omit<Note, "id"> = {
      title,
      slug,
      content: `# ${title}\n\nStart writing markdown content here...`,
      tags: ["new"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_published: false,
    };

    const id = await db.notes.add(newNote);
    setActiveNoteId(id);
    setActiveView("notes");
    setIsMobileOpen(false);
  };

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
    await db.notes.bulkAdd(importedNotes);
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
        onNewNote={handleCreateNewNote}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenImport={() => setIsImportOpen(true)}
        onExportAll={handleExportAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDeleteNote={handleDeleteNote}
        isMobileOpen={isMobileOpen}
        onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
        activeView={activeView}
        onChangeView={setActiveView}
        pendingTodosCount={pendingTodosCount}
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
            onSave={handleSaveNote}
            onOpenPublish={(note) => setPublishModalNote(note)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <h2 className="text-xl font-bold mb-2 text-neutral-300">No Notes Available</h2>
            <p className="text-xs mb-4">Create your first note or import markdown files to get started.</p>
            <button
              onClick={handleCreateNewNote}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30"
            >
              Create New Note
            </button>
          </div>
        )}
      </main>

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
    </div>
  );
}
