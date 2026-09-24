"use client";

import React, { useState } from "react";
import { parseFrontmatter, extractTitle, generateSlug, extractInlineTags } from "@/lib/markdown";
import { Note } from "@/lib/types";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchImport: (importedNotes: Omit<Note, "id">[]) => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onBatchImport }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleProcessImport = async () => {
    if (files.length === 0) return;
    setIsImporting(true);
    setResultMessage(null);

    const importedNotes: Omit<Note, "id">[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const { frontmatter, body } = parseFrontmatter(text);
        const title = frontmatter.title || extractTitle(body, file.name.replace(/\.md$/i, ""));
        const slug = frontmatter.slug || generateSlug(title);
        const inlineTags = extractInlineTags(body);
        const frontmatterTags = frontmatter.tags || [];
        const combinedTags = Array.from(new Set([...frontmatterTags, ...inlineTags]));

        importedNotes.push({
          title,
          slug,
          content: body,
          tags: combinedTags,
          created_at: frontmatter.date || new Date(file.lastModified).toISOString(),
          updated_at: new Date().toISOString(),
          is_published: false,
        });
      } catch (err) {
        console.error("Error reading file:", file.name, err);
      }
    }

    await onBatchImport(importedNotes);
    setIsImporting(false);
    setResultMessage(`Successfully imported ${importedNotes.length} note(s)!`);
    setFiles([]);
    setTimeout(() => {
      onClose();
      setResultMessage(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-neutral-100">Import Markdown Files</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <label className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/60 bg-neutral-950/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
            <Upload className="w-8 h-8 text-neutral-500 group-hover:text-indigo-400 transition-colors mb-2" />
            <span className="text-xs font-semibold text-neutral-200">
              {files.length > 0 ? `${files.length} file(s) selected` : "Select .md files to import"}
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">Supports YAML frontmatter & markdown</span>
            <input
              type="file"
              multiple
              accept=".md,text/markdown"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-neutral-300 py-1 px-2 rounded hover:bg-neutral-900">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {resultMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{resultMessage}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={files.length === 0 || isImporting}
              onClick={handleProcessImport}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              {isImporting ? "Importing..." : "Start Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
