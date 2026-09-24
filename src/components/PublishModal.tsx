"use client";

import React, { useState } from "react";
import { Note } from "@/lib/types";
import { downloadFile } from "@/lib/markdown";
import { Globe, Copy, Check, Download, X, ExternalLink, ShieldCheck } from "lucide-react";

interface PublishModalProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onTogglePublish: (noteId: number, isPublished: boolean) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({ note, isOpen, onClose, onTogglePublish }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public/notes/${note.slug}`
    : `/public/notes/${note.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadStandaloneHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title} - Published Note</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; line-height: 1.6; }
    h1 { font-size: 2.25rem; font-weight: 800; border-bottom: 1px solid #27272a; padding-bottom: 0.5rem; color: #a5b4fc; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0; color: #d4d4d8; font-style: italic; }
    code { background: #18181b; color: #a5b4fc; padding: 0.2rem 0.4rem; rounded: 4px; font-family: monospace; }
    pre { background: #18181b; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    a { color: #818cf8; text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <p><small>Published on ${new Date().toLocaleDateString()} • Tags: ${note.tags.join(", ")}</small></p>
  <hr style="border-color: #27272a; margin: 1.5rem 0;" />
  <div id="content">${note.content}</div>
</body>
</html>`;

    downloadFile(`${note.slug}.html`, htmlContent, "text/html");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-neutral-100">Public Publishing</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <div>
              <h3 className="text-sm font-semibold text-neutral-200">Public Status</h3>
              <p className="text-xs text-neutral-400">
                {note.is_published ? "Accessible via shareable link" : "Private (only visible in your browser)"}
              </p>
            </div>

            <button
              onClick={() => {
                if (note.id) onTogglePublish(note.id, !note.is_published);
              }}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 ${
                note.is_published
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
              }`}
            >
              {note.is_published ? "Unpublish" : "Publish Now"}
            </button>
          </div>

          {/* Share Link Input */}
          {note.is_published && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400">Shareable Public URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Preview Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" /> HTML Sanitized
                </span>
              </div>
            </div>
          )}

          {/* Download Standalone HTML Button */}
          <div className="pt-4 border-t border-neutral-800">
            <button
              onClick={handleDownloadStandaloneHTML}
              className="w-full py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Download Standalone HTML File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
