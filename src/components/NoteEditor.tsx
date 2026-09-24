"use client";

import React, { useState, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { generateSlug, extractTitle, extractInlineTags, downloadFile, formatNoteToMarkdown } from "@/lib/markdown";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  Save,
  Globe,
  Download,
  Eye,
  Edit3,
  Columns,
  Bold,
  Italic,
  Code,
  Heading,
  Link as LinkIcon,
  Tag as TagIcon,
  Sparkles,
  Share2,
  CheckCircle2,
  List,
  ListOrdered,
  CheckSquare,
  Table,
  Image as ImageIcon,
  Code2,
  Superscript,
  Subscript,
  Strikethrough,
  Minus,
  Link2
} from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onSave: (updated: Note) => void;
  onOpenPublish: (note: Note) => void;
  availableTags?: string[];
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onOpenPublish, availableTags = [] }) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [slug, setSlug] = useState(note.slug);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");
  const [isTagSuggestionsOpen, setIsTagSuggestionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split");
  const [isSaved, setIsSaved] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSlug(note.slug);
    setTags(note.tags);
    setIsSaved(true);
  }, [note.id]);

  // Auto-save debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== note.content || tags !== note.tags) {
        handleSave();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, content, tags]);

  const handleSave = () => {
    const derivedSlug = generateSlug(title || "Untitled");
    const derivedTitle = title.trim() || extractTitle(content, "Untitled Note");
    const inlineTags = extractInlineTags(content);
    const combinedTags = Array.from(new Set([...tags, ...inlineTags]));

    const updatedNote: Note = {
      ...note,
      title: derivedTitle,
      slug: derivedSlug,
      content,
      tags: combinedTags,
      updated_at: new Date().toISOString(),
    };

    onSave(updatedNote);
    setIsSaved(true);
  };

  const handleInsertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const hasSelection = Boolean(selectedText);
    const replacement = `${before}${selectedText || (after ? "text" : "")}${after}`;

    let success = false;
    try {
      success = document.execCommand("insertText", false, replacement);
    } catch {
      success = false;
    }

    if (!success) {
      const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
      setContent(newContent);
    } else {
      setContent(textarea.value);
    }

    setIsSaved(false);

    if (!hasSelection && after) {
      const selectStart = start + before.length;
      const selectEnd = selectStart + 4;
      textarea.setSelectionRange(selectStart, selectEnd);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput("");
      setIsSaved(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    setIsSaved(false);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const lineStart = content.lastIndexOf("\n", cursor - 1) + 1;
      const lineEnd = content.indexOf("\n", cursor);
      const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
      const textBeforeCursor = content.substring(lineStart, cursor);

      const insertNext = (nextPrefix: string) => {
        e.preventDefault();
        let success = false;
        try {
          success = document.execCommand("insertText", false, nextPrefix);
        } catch {
          success = false;
        }

        if (!success) {
          const newContent = content.substring(0, cursor) + nextPrefix + content.substring(cursor);
          setContent(newContent);
          const newCursorPos = cursor + nextPrefix.length;
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          setContent(textarea.value);
        }
        setIsSaved(false);
      };

      const clearLine = () => {
        e.preventDefault();
        const newContent = content.substring(0, lineStart) + content.substring(actualLineEnd);
        setContent(newContent);
        setIsSaved(false);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart);
        }, 0);
      };

      // 1. Task List: - [ ] or - [x] or * [ ]
      const taskMatch = textBeforeCursor.match(/^(\s*[-*+]\s+\[[ xX]?\]\s+)(.*)$/);
      if (taskMatch) {
        const [, prefix, rest] = taskMatch;
        if (!rest.trim()) {
          clearLine();
          return;
        }

        const indentMatch = prefix.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";
        insertNext(`\n${indent}- [ ] `);
        return;
      }

      // 2. Numbered List: 1. test
      const numberMatch = textBeforeCursor.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        const [, indent, numStr, rest] = numberMatch;
        if (!rest.trim()) {
          clearLine();
          return;
        }

        const nextNum = parseInt(numStr, 10) + 1;
        insertNext(`\n${indent}${nextNum}. `);
        return;
      }

      // 3. Unordered Bullet List: - test or * test
      const bulletMatch = textBeforeCursor.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch) {
        const [, indent, bulletSymbol, rest] = bulletMatch;
        if (!rest.trim()) {
          clearLine();
          return;
        }

        insertNext(`\n${indent}${bulletSymbol} `);
        return;
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Editor Header Bar */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Title Input & Save Status */}
        <div className="flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Note Title..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(generateSlug(e.target.value));
              setIsSaved(false);
            }}
            className="w-full bg-transparent text-lg font-bold text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-b focus:border-indigo-500 pb-1"
          />
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-1">
            <span>/notes/{slug}</span>
            {isSaved ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> Auto-saved
              </span>
            ) : (
              <span className="text-amber-400 text-[10px]">Saving...</span>
            )}
          </div>
        </div>

        {/* View Mode Controls & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === "edit" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Edit Only Mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === "split" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Split View Mode"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === "preview" ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Preview Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => onOpenPublish(note)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              note.is_published
                ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/60"
                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${note.is_published ? "text-emerald-400" : ""}`} />
            <span>{note.is_published ? "Published" : "Publish"}</span>
          </button>

          <button
            onClick={() => downloadFile(`${note.slug}.md`, formatNoteToMarkdown(note))}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 transition-colors"
            title="Download .md File"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {viewMode !== "preview" && (
        <div className="px-4 py-2 bg-neutral-900/90 border-b border-neutral-800/60 flex items-center gap-1 text-xs relative z-30 flex-wrap sm:flex-nowrap">
          {/* Text Styling */}
          <button
            onClick={() => handleInsertText("**", "**")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("*", "*")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("~~", "~~")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("# ")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Heading 1 (# Heading)"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-800/80 my-auto mx-1 shrink-0" />

          {/* Lists */}
          <button
            onClick={() => handleInsertText("- [ ] ")}
            className="p-1.5 rounded hover:bg-neutral-800 text-emerald-400 transition-colors"
            title="Task List (- [ ])"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("1. ")}
            className="p-1.5 rounded hover:bg-neutral-800 text-amber-400 transition-colors"
            title="Numbered List (1. )"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("- ")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Bullet List (- )"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-800/80 my-auto mx-1 shrink-0" />

          {/* Tables & Links & Images */}
          <button
            onClick={() =>
              handleInsertText(
                "\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n"
              )
            }
            className="p-1.5 rounded hover:bg-neutral-800 text-indigo-400 transition-colors"
            title="Insert Markdown Table"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("![Alt text](", ")")}
            className="p-1.5 rounded hover:bg-neutral-800 text-pink-400 transition-colors"
            title="Insert Image (![alt](url))"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("[[", "]]")}
            className="p-1.5 rounded hover:bg-neutral-800 text-indigo-400 transition-colors font-mono font-bold flex items-center gap-1"
            title="Internal Link / Wikilink [[note]]"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">[[ ]]</span>
          </button>

          <div className="h-4 w-px bg-neutral-800/80 my-auto mx-1 shrink-0" />

          {/* Code & Math */}
          <button
            onClick={() => handleInsertText("`", "`")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Inline Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              handleInsertText("\n```javascript\n// Write code here\n```\n")
            }
            className="p-1.5 rounded hover:bg-neutral-800 text-cyan-400 transition-colors"
            title="Code Block (```lang)"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("^2^")}
            className="p-1.5 rounded hover:bg-neutral-800 text-purple-300 transition-colors"
            title="Square / Superscript (x^2)"
          >
            <Superscript className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("~base~")}
            className="p-1.5 rounded hover:bg-neutral-800 text-purple-300 transition-colors"
            title="Subscript / Base (x_0)"
          >
            <Subscript className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertText("$\\sqrt{x}$")}
            className="p-1.5 rounded hover:bg-neutral-800 text-purple-400 transition-colors font-mono text-[11px]"
            title="Square Root (√x)"
          >
            √x
          </button>
          <button
            onClick={() => handleInsertText("$$\n", "\n$$")}
            className="p-1.5 rounded hover:bg-neutral-800 text-purple-400 transition-colors font-mono text-[11px]"
            title="LaTeX Block Math ($$)"
          >
            $$
          </button>

          <div className="h-4 w-px bg-neutral-800/80 my-auto mx-1 shrink-0" />

          {/* Blocks */}
          <button
            onClick={() => handleInsertText("> [!NOTE]\n> ")}
            className="p-1.5 rounded hover:bg-neutral-800 text-blue-400 transition-colors text-[11px] font-medium"
            title="Callout Box"
          >
            Callout
          </button>
          <button
            onClick={() =>
              handleInsertText("```mermaid\ngraph TD\n    A[Start] --> B[Finish]\n```")
            }
            className="p-1.5 rounded hover:bg-neutral-800 text-emerald-400 transition-colors text-[11px] font-mono"
            title="Mermaid Diagram"
          >
            Mermaid
          </button>
          <button
            onClick={() => handleInsertText("\n---\n")}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 transition-colors"
            title="Horizontal Divider (---)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Tags manager */}
          <div className="ml-auto flex items-center gap-1.5 relative">
            <TagIcon className="w-3.5 h-3.5 text-neutral-500" />
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-[10px] flex items-center gap-1"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 ml-0.5 text-[9px]"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="+ Add tag"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setIsTagSuggestionsOpen(true);
                }}
                onFocus={() => setIsTagSuggestionsOpen(true)}
                onBlur={() => setTimeout(() => setIsTagSuggestionsOpen(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                    setIsTagSuggestionsOpen(false);
                  }
                }}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 w-24"
              />

              {/* Tag Autocomplete Dropdown */}
              {isTagSuggestionsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 max-h-44 overflow-y-auto p-1 text-xs backdrop-blur-xl">
                  <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 border-b border-neutral-800/60">
                    Search Existing Tags
                  </div>
                  {availableTags
                    .filter(
                      (t) =>
                        !tags.includes(t) &&
                        (!tagInput.trim() ||
                          t.toLowerCase().includes(tagInput.trim().toLowerCase().replace(/^#/, "")))
                    )
                    .map((suggestedTag) => (
                      <button
                        key={suggestedTag}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!tags.includes(suggestedTag)) {
                            setTags([...tags, suggestedTag]);
                            setIsSaved(false);
                          }
                          setTagInput("");
                          setIsTagSuggestionsOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600/30 hover:text-indigo-200 text-neutral-300 text-[11px] flex items-center justify-between transition-colors group"
                      >
                        <span>#{suggestedTag}</span>
                        <span className="text-[9px] text-neutral-500 group-hover:text-indigo-300">+ add</span>
                      </button>
                    ))}
                  {availableTags.filter(
                    (t) =>
                      !tags.includes(t) &&
                      (!tagInput.trim() ||
                        t.toLowerCase().includes(tagInput.trim().toLowerCase().replace(/^#/, "")))
                  ).length === 0 && (
                    <div className="px-2 py-2 text-[10px] text-neutral-500 text-center">
                      {tagInput.trim() ? "Press Enter to create new tag" : "No other tags available"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace (Editor + Rendered Preview) */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        {/* Textarea Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`flex-1 flex flex-col h-full ${viewMode === "split" ? "border-r border-neutral-800/80" : ""}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsSaved(false);
              }}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Write Markdown here..."
              className="w-full h-full p-6 bg-neutral-950 text-neutral-200 font-mono text-sm leading-relaxed resize-none focus:outline-none selection:bg-indigo-600 selection:text-white"
            />
          </div>
        )}

        {/* Live Rendered Markdown Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="flex-1 h-full overflow-y-auto p-6 bg-neutral-900/30">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
    </div>
  );
};
