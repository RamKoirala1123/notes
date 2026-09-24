"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/db";
import { Note } from "@/lib/types";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Globe, Calendar, Tag, ShieldCheck } from "lucide-react";

export default function PublicNotePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    db.notes
      .where("slug")
      .equals(slug)
      .first()
      .then((found) => {
        if (found && found.is_published) {
          setNote(found);
        } else {
          setNote(null);
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-xs text-neutral-500 font-sans">
        Loading public note...
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-neutral-400 font-sans">
        <Globe className="w-12 h-12 text-neutral-600 mb-3" />
        <h1 className="text-xl font-bold text-neutral-200 mb-1">Note Unavailable</h1>
        <p className="text-xs text-neutral-500 max-w-sm">
          This note is either private, unpublished, or does not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header Banner */}
      <header className="border-b border-neutral-800 bg-neutral-900/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-300">Published Note</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sanitized & Script-Safe</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <article className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
          {/* Note Metadata Header */}
          <div className="border-b border-neutral-800/80 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-100 tracking-tight mb-4">
              {note.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {new Date(note.published_at || note.updated_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>

              {note.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-[10px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rendered Body */}
          <MarkdownRenderer content={note.content} />
        </article>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-xs text-neutral-600 border-t border-neutral-900 mt-12">
        Powered by MyNotes Next.js
      </footer>
    </div>
  );
}
