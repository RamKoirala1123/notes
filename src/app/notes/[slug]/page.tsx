"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Note } from "@/lib/types";
import { generateSlug } from "@/lib/markdown";
import { NoteEditor } from "@/components/NoteEditor";
import { PublishModal } from "@/components/PublishModal";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";

export default function NoteSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishModalNote, setPublishModalNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!slug) return;
    db.notes
      .where("slug")
      .equals(slug)
      .first()
      .then((foundNote) => {
        if (foundNote) {
          setNote(foundNote);
        } else {
          setNote(null);
        }
        setLoading(false);
      });
  }, [slug]);

  const handleCreateMissingNote = async () => {
    const rawTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const newNote: Omit<Note, "id"> = {
      title: rawTitle,
      slug: slug,
      content: `# ${rawTitle}\n\nThis note was created automatically from a Wikilink.`,
      tags: ["linked"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_published: false,
    };

    const id = await db.notes.add(newNote);
    const created = await db.notes.get(id);
    if (created) {
      setNote(created);
    }
  };

  const handleSaveNote = async (updatedNote: Note) => {
    if (updatedNote.id) {
      await db.notes.put(updatedNote);
      setNote(updatedNote);
    }
  };

  const handleTogglePublish = async (noteId: number, isPublished: boolean) => {
    await db.notes.update(noteId, {
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : undefined,
    });
    if (note) {
      setNote({ ...note, is_published: isPublished });
    }
    if (publishModalNote) {
      setPublishModalNote({ ...publishModalNote, is_published: isPublished });
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-xs">
        Loading note...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Header Navigation */}
      <div className="p-3 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Notes</span>
        </button>

        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-neutral-300">MyNotes Next</span>
        </div>
      </div>

      {/* Workspace Editor or Create Prompt */}
      <div className="flex-1 overflow-hidden">
        {note ? (
          <NoteEditor
            note={note}
            onSave={handleSaveNote}
            onOpenPublish={(n) => setPublishModalNote(n)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-200 mb-1">Note &quot;{slug}&quot; Not Found</h2>
            <p className="text-xs text-neutral-400 mb-6">
              This note does not exist in your local workspace yet. Would you like to create it now?
            </p>
            <button
              onClick={handleCreateMissingNote}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note &quot;{slug}&quot;</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {publishModalNote && (
        <PublishModal
          note={publishModalNote}
          isOpen={!!publishModalNote}
          onClose={() => setPublishModalNote(null)}
          onTogglePublish={handleTogglePublish}
        />
      )}
    </div>
  );
}
