"use client";

import React, { useState, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { generateSlug, extractTitle, extractInlineTags, downloadFile, formatNoteToMarkdown, toggleTaskInContent } from "@/lib/markdown";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { getCaretCoordinates } from "@/lib/caret-coordinates";
import { SlashCommandMenu, SLASH_COMMANDS, SlashCommand } from "./SlashCommandMenu";
import { FloatingSelectionToolbar, SelectionAction } from "./FloatingSelectionToolbar";
import {
  Globe,
  Download,
  Folder,
  ChevronDown,
  Edit3,
  Columns,
  Eye,
  CheckCircle2,
  Bold,
  Italic,
  Strikethrough,
  Heading,
  CheckSquare,
  ListOrdered,
  List,
  Table,
  Link2,
  ImageIcon,
  Quote,
  Code,
  Code2,
  Minus,
  SlidersHorizontal,
} from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onSave: (updated: Note) => void;
  onOpenPublish: (note: Note) => void;
  availableTags?: string[];
  folders?: string[];
  viewMode?: "split" | "edit" | "preview";
  onViewModeChange?: (mode: "split" | "edit" | "preview") => void;
  onTogglePreview?: () => void;
  onShowToast?: (msg: string) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onOpenPublish,
  availableTags = [],
  folders = ["Work", "Home"],
  viewMode: controlledViewMode,
  onViewModeChange,
  onTogglePreview,
  onShowToast,
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [slug, setSlug] = useState(note.slug);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [folder, setFolder] = useState<string | undefined>(note.folder);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);

  // Notion-style Slash Command Menu state (Phase 2)
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [slashStartIndex, setSlashStartIndex] = useState(0);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  const isSlashOpenRef = useRef(false);
  const slashQueryRef = useRef("");
  const slashSelectedIndexRef = useRef(0);
  const filteredSlashCommandsRef = useRef<SlashCommand[]>([]);

  useEffect(() => {
    isSlashOpenRef.current = isSlashOpen;
  }, [isSlashOpen]);

  useEffect(() => {
    slashQueryRef.current = slashQuery;
  }, [slashQuery]);

  useEffect(() => {
    slashSelectedIndexRef.current = slashSelectedIndex;
  }, [slashSelectedIndex]);

  // Floating Selection Formatting Toolbar state (Phase 4)
  const [isSelectionToolbarOpen, setIsSelectionToolbarOpen] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState<{
    top: number;
    left: number;
    height?: number;
  }>({ top: 0, left: 0, height: 22 });

  const [tagInput, setTagInput] = useState("");
  const [isTagSuggestionsOpen, setIsTagSuggestionsOpen] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<"split" | "edit" | "preview">("split");
  const [isSaved, setIsSaved] = useState(true);
  const [showToolbar, setShowToolbar] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mynotes_show_toolbar");
      if (saved !== null) return saved === "true";
    }
    return false;
  });

  const toggleToolbar = () => {
    setShowToolbar((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mynotes_show_toolbar", String(next));
      } catch { }
      return next;
    });
  };

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const rawViewMode = controlledViewMode ?? internalViewMode;
  const viewMode = (isMobileScreen && rawViewMode === "split") ? "edit" : rawViewMode;

  const setViewMode = (mode: "split" | "edit" | "preview" | ((prev: "split" | "edit" | "preview") => "split" | "edit" | "preview")) => {
    const resolvedMode = typeof mode === "function" ? mode(viewMode) : mode;
    setInternalViewMode(resolvedMode);
    onViewModeChange?.(resolvedMode);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const previousEditModeRef = useRef<"split" | "edit">("split");

  // Keep latest data in ref for shortcuts
  const latestDataRef = useRef({ title, content, tags, note, viewMode, folder });
  useEffect(() => {
    latestDataRef.current = { title, content, tags, note, viewMode, folder };
  }, [title, content, tags, note, viewMode, folder]);

  // Sync state when active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSlug(note.slug);
    setTags(note.tags);
    setFolder(note.folder);
    setIsSaved(true);

    if (note.title.startsWith("Untitled Note")) {
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 100);
    }
  }, [note.id]);

  // Close folder menu and floating popups on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      setIsFolderMenuOpen(false);
      const target = e.target as HTMLElement;
      if (
        textareaRef.current &&
        !textareaRef.current.contains(target) &&
        !target.closest?.(".slash-command-menu") &&
        !target.closest?.(".floating-selection-toolbar")
      ) {
        setIsSlashOpen(false);
        setIsSelectionToolbarOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Focus textarea when switching back to split or edit mode
  useEffect(() => {
    if (viewMode === "split" || viewMode === "edit") {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [viewMode]);

  const handleSave = () => {
    const { title: curTitle, content: curContent, tags: curTags, note: curNote, folder: curFolder } = latestDataRef.current;
    const derivedSlug = curNote.slug || generateSlug(curTitle || "Untitled");
    const derivedTitle = curTitle.trim() || extractTitle(curContent, "Untitled Note");
    const inlineTags = extractInlineTags(curContent);
    const combinedTags = Array.from(new Set([...curTags, ...inlineTags]));

    const updatedNote: Note = {
      ...curNote,
      title: derivedTitle,
      slug: derivedSlug,
      content: curContent,
      tags: combinedTags,
      folder: curFolder,
      updated_at: new Date().toISOString(),
    };

    onSave(updatedNote);
    setIsSaved(true);
  };

  const handleManualSave = () => {
    handleSave();
    onShowToast?.("Note saved! (⌘S)");
  };

  // Auto-save debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== note.content || tags !== note.tags || folder !== note.folder) {
        handleSave();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, content, tags, folder]);

  // Keyboard Shortcuts (⌘S: Save Note)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Save Note: ⌘ + S or Ctrl + S
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        onShowToast?.("Note saved! (⌘S)");
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

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

  // Interactive checklist toggling in Preview and Split mode (Phase 3)
  const handleToggleTask = (taskIndex: number, checked: boolean) => {
    setContent((prev) => {
      const updated = toggleTaskInContent(prev, taskIndex, checked);
      return updated;
    });
    setIsSaved(false);
  };

  const handleToggleHeading = (level: number = 1) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = content.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? content.length : nextNewline;

    const blockText = content.substring(lineStart, lineEnd);
    const lines = blockText.split("\n");
    const prefix = "#".repeat(level) + " ";

    const allMatch = lines.every((l) => l.startsWith(prefix));
    const newLines = lines.map((l) => {
      const stripped = l.replace(/^#{1,6}\s+/, "");
      return allMatch ? stripped : `${prefix}${stripped}`;
    });

    const replacement = newLines.join("\n");
    const newContent = content.substring(0, lineStart) + replacement + content.substring(lineEnd);
    setContent(newContent);
    setIsSaved(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 0);
  };

  const handleToggleBlockquote = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = content.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? content.length : nextNewline;

    const blockText = content.substring(lineStart, lineEnd);
    const lines = blockText.split("\n");

    const allMatch = lines.every((l) => /^\s*>\s*/.test(l));
    const newLines = lines.map((l) => {
      if (allMatch) {
        return l.replace(/^(\s*)>\s?/, "$1");
      } else {
        return `> ${l}`;
      }
    });

    const replacement = newLines.join("\n");
    const newContent = content.substring(0, lineStart) + replacement + content.substring(lineEnd);
    setContent(newContent);
    setIsSaved(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 0);
  };

  const updateSlashPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const coords = getCaretCoordinates(textarea, slashStartIndex);
    setSlashPosition({
      top: coords.top + coords.height + 6,
      left: coords.left,
    });
  };

  const updateSelectionPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const coordsStart = getCaretCoordinates(textarea, start);
    const coordsEnd = getCaretCoordinates(textarea, end);
    const isSameLine = Math.abs(coordsStart.top - coordsEnd.top) < 12;
    const centerX = isSameLine
      ? (coordsStart.left + coordsEnd.left) / 2
      : coordsStart.left;

    setSelectionToolbarPosition({
      top: coordsStart.top,
      left: centerX,
      height: coordsStart.height || 22,
    });
  };

  const handleContentOrSelectionChange = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Check selection for Floating Toolbar (Phase 4)
    if (start !== end && end - start > 0) {
      const selected = textarea.value.substring(start, end).trim();
      if (selected.length > 0) {
        setIsSlashOpen(false);
        const coordsStart = getCaretCoordinates(textarea, start);
        const coordsEnd = getCaretCoordinates(textarea, end);
        const isSameLine = Math.abs(coordsStart.top - coordsEnd.top) < 12;
        const centerX = isSameLine
          ? (coordsStart.left + coordsEnd.left) / 2
          : coordsStart.left;

        setSelectionToolbarPosition({
          top: coordsStart.top,
          left: centerX,
          height: coordsStart.height || 22,
        });
        setIsSelectionToolbarOpen(true);
        return;
      }
    }
    setIsSelectionToolbarOpen(false);

    // Check Slash Command trigger (Phase 2)
    const cursor = start;
    const lineStart = textarea.value.lastIndexOf("\n", cursor - 1) + 1;
    const textBeforeCursor = textarea.value.substring(lineStart, cursor);

    const slashMatch = textBeforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      const query = slashMatch[1];
      const slashIdx = cursor - query.length - 1;
      const coords = getCaretCoordinates(textarea, slashIdx);

      // Only reset selectedIndex to 0 if the query changed or the menu was not open!
      if (!isSlashOpenRef.current || slashQueryRef.current !== query) {
        slashSelectedIndexRef.current = 0;
        setSlashSelectedIndex(0);
      }

      slashQueryRef.current = query;
      isSlashOpenRef.current = true;

      setSlashQuery(query);
      setSlashStartIndex(slashIdx);
      setSlashPosition({
        top: coords.top + coords.height + 6,
        left: coords.left,
      });
      setIsSlashOpen(true);
    } else {
      isSlashOpenRef.current = false;
      setIsSlashOpen(false);
    }
  };

  const executeSlashCommand = (cmd: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const from = Math.max(0, slashStartIndex);
    const to = Math.max(from, cursor);

    const lineStart = content.lastIndexOf("\n", from - 1) + 1;
    const linePrefix = content.substring(lineStart, from);
    const isLineStart = linePrefix.trim() === "";

    let { replacement, cursorOffset } = cmd.execute(linePrefix);

    const requiresNewline = [
      "h1", "h2", "h3", "task", "bullet", "number",
      "callout-note", "callout-tip", "callout-warning",
      "quote", "code", "mermaid", "math", "table", "divider"
    ].includes(cmd.id);

    if (requiresNewline && !isLineStart) {
      replacement = "\n" + replacement;
      cursorOffset += 1;
    }

    const before = content.substring(0, from);
    const after = content.substring(to);
    const newContent = before + replacement + after;
    setContent(newContent);
    setIsSaved(false);
    setIsSlashOpen(false);

    const newCursor = from + cursorOffset;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
      handleContentOrSelectionChange();
    }, 0);
  };

  const handleSelectionAction = (action: SelectionAction) => {
    switch (action) {
      case "bold":
        handleInsertText("**", "**");
        break;
      case "italic":
        handleInsertText("*", "*");
        break;
      case "strikethrough":
        handleInsertText("~~", "~~");
        break;
      case "code":
        handleInsertText("`", "`");
        break;
      case "link":
        handleInsertText("[", "](https://)");
        break;
      case "wikilink":
        handleInsertText("[[", "]]");
        break;
      case "heading":
        handleToggleHeading(1);
        break;
      case "task":
        handleToggleList("task");
        break;
      case "bullet":
        handleToggleList("bullet");
        break;
      case "number":
        handleToggleList("number");
        break;
      case "quote":
        handleToggleBlockquote();
        break;
    }

    setTimeout(() => {
      handleContentOrSelectionChange();
    }, 10);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const trimmed = text.trim();
    // Check if the pasted string is a valid web link (http://, https://, or www.)
    const isUrl = (() => {
      if (!trimmed || /\s/.test(trimmed)) return false;
      try {
        const urlCandidate = trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;
        const parsed = new URL(urlCandidate);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    })();

    if (isUrl) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const fullUrl = trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end).trim();

      // If user highlighted text, create [selectedText](fullUrl).
      // If no text selected, create [fullUrl](fullUrl) so it's a clickable link in preview mode.
      const linkMarkdown = selected.length > 0
        ? `[${selected}](${fullUrl})`
        : `[${fullUrl}](${fullUrl})`;

      let success = false;
      try {
        success = document.execCommand("insertText", false, linkMarkdown);
      } catch {
        success = false;
      }

      if (!success) {
        const val = textarea.value;
        const newContent = val.substring(0, start) + linkMarkdown + val.substring(end);
        setContent(newContent);
      } else {
        setContent(textarea.value);
      }

      setIsSaved(false);
      const newCursor = start + linkMarkdown.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
        handleContentOrSelectionChange();
      }, 0);
    }
  };

  const handleToggleList = (type: "bullet" | "number" | "task") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the full lines spanned by selection
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = content.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? content.length : nextNewline;

    const blockText = content.substring(lineStart, lineEnd);
    const lines = blockText.split("\n");

    const prefixes = {
      bullet: (idx: number) => "- ",
      number: (idx: number) => `${idx + 1}. `,
      task: (idx: number) => "- [ ] ",
    };

    // Check if all lines already match this format to toggle it off
    const allMatch = lines.every((l) => {
      if (type === "bullet") return /^\s*[-*+]\s+/.test(l);
      if (type === "number") return /^\s*\d+\.\s+/.test(l);
      if (type === "task") return /^\s*[-*+]\s+\[[ xX]?\]\s+/.test(l);
      return false;
    });

    let newLines: string[];
    if (allMatch) {
      // Remove prefixes
      newLines = lines.map((l) => {
        if (type === "bullet") return l.replace(/^(\s*)[-*+]\s+/, "$1");
        if (type === "number") return l.replace(/^(\s*)\d+\.\s+/, "$1");
        if (type === "task") return l.replace(/^(\s*)[-*+]\s+\[[ xX]?\]\s+/, "$1");
        return l;
      });
    } else {
      // Add or replace prefixes
      newLines = lines.map((l, idx) => {
        // Strip any existing list prefix first
        const stripped = l
          .replace(/^(\s*)[-*+]\s+\[[ xX]?\]\s+/, "$1")
          .replace(/^(\s*)[-*+]\s+/, "$1")
          .replace(/^(\s*)\d+\.\s+/, "$1");
        const indentMatch = stripped.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : "";
        const rest = stripped.substring(indent.length);
        return `${indent}${prefixes[type](idx)}${rest}`;
      });
    }

    const replacement = newLines.join("\n");
    const newContent = content.substring(0, lineStart) + replacement + content.substring(lineEnd);
    setContent(newContent);
    setIsSaved(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 0);
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

  // Helper to find the preceding numbered item count at a specific indentation
  const getPrecedingNumber = (text: string, currentLineStart: number, targetIndent: string): number => {
    const textBefore = text.substring(0, currentLineStart);
    const lines = textBefore.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const match = line.match(/^(\s*)(\d+)\.\s+/);
      if (match) {
        const [, indent, numStr] = match;
        if (indent === targetIndent) {
          return parseInt(numStr, 10);
        }
      } else if (line.trim() !== "" && !line.startsWith(targetIndent)) {
        break;
      }
    }
    return 0;
  };

  const cleanSlashQuery = slashQuery.toLowerCase().trim();
  const filteredSlashCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!cleanSlashQuery) return true;
    return (
      cmd.title.toLowerCase().includes(cleanSlashQuery) ||
      cmd.description.toLowerCase().includes(cleanSlashQuery) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(cleanSlashQuery))
    );
  });
  filteredSlashCommandsRef.current = filteredSlashCommands;

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 0. Notion-Style Slash Menu Navigation
    if (isSlashOpenRef.current) {
      const commands = filteredSlashCommandsRef.current;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (commands.length > 0) {
          const nextIndex = (slashSelectedIndexRef.current + 1) % commands.length;
          slashSelectedIndexRef.current = nextIndex;
          setSlashSelectedIndex(nextIndex);
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (commands.length > 0) {
          const prevIndex = (slashSelectedIndexRef.current - 1 + commands.length) % commands.length;
          slashSelectedIndexRef.current = prevIndex;
          setSlashSelectedIndex(prevIndex);
        }
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const currentIdx = slashSelectedIndexRef.current;
        if (commands.length > 0 && currentIdx >= 0 && currentIdx < commands.length) {
          executeSlashCommand(commands[currentIdx]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        isSlashOpenRef.current = false;
        setIsSlashOpen(false);
        return;
      }
    }
    // Preview toggle shortcut: ⌘P / Ctrl+P
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
      e.preventDefault();
      e.stopPropagation();
      if (onTogglePreview) {
        onTogglePreview();
      } else {
        setViewMode(viewMode === "preview" ? "split" : "preview");
      }
      return;
    }

    // Bold shortcut: ⌘B / Ctrl+B
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "b" || e.code === "KeyB")) {
      e.preventDefault();
      handleInsertText("**", "**");
      return;
    }

    // Italic shortcut: ⌘I / Ctrl+I
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "i" || e.code === "KeyI")) {
      e.preventDefault();
      handleInsertText("*", "*");
      return;
    }

    // Backspace key handling for list outdenting and prefix removal
    if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Only handle when cursor is collapsed (no text selected)
      if (start === end) {
        const lineStart = content.lastIndexOf("\n", start - 1) + 1;
        const nextNewline = content.indexOf("\n", start);
        const lineEnd = nextNewline === -1 ? content.length : nextNewline;
        const textBeforeCursor = content.substring(lineStart, start);
        const restAfterCursor = content.substring(start, lineEnd);

        // 1. Numbered List prefix: ^(\s*)(\d+)\.\s*$
        const numberPrefixMatch = textBeforeCursor.match(/^(\s*)(\d+)\.\s*$/);
        if (numberPrefixMatch) {
          e.preventDefault();
          const [, indent] = numberPrefixMatch;
          if (indent.length >= 2) {
            // Outdent to parent level and continue previous sequence
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const prevNum = getPrecedingNumber(content, lineStart, newIndent);
            const newNum = prevNum + 1;
            const newLine = `${newIndent}${newNum}. ${restAfterCursor}`;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + `${newIndent}${newNum}. `.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
          } else {
            // No indentation: erase prefix, leaving clean line
            const newLine = restAfterCursor;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          }
          return;
        }

        // 2. Task List prefix: ^(\s*)([-*+]\s+\[[ xX]?\]\s*)$
        const taskPrefixMatch = textBeforeCursor.match(/^(\s*)([-*+]\s+\[[ xX]?\]\s*)$/);
        if (taskPrefixMatch) {
          e.preventDefault();
          const [, indent, box] = taskPrefixMatch;
          if (indent.length >= 2) {
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const newLine = `${newIndent}${box}${restAfterCursor}`;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + `${newIndent}${box}`.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
          } else {
            const newLine = restAfterCursor;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          }
          return;
        }

        // 3. Bullet List prefix: ^(\s*)([-*+]\s*)$
        const bulletPrefixMatch = textBeforeCursor.match(/^(\s*)([-*+]\s*)$/);
        if (bulletPrefixMatch) {
          e.preventDefault();
          const [, indent, bullet] = bulletPrefixMatch;
          if (indent.length >= 2) {
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const newLine = `${newIndent}${bullet}${restAfterCursor}`;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + `${newIndent}${bullet}`.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
          } else {
            const newLine = restAfterCursor;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          }
          return;
        }
      }
    }

    // Tab and Shift+Tab key handling for lists and indentation
    if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const isMultiLine = start !== end && content.substring(start, end).includes("\n");

      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const nextNewline = content.indexOf("\n", end);
      const lineEnd = nextNewline === -1 ? content.length : nextNewline;

      if (isMultiLine) {
        const lines = content.substring(lineStart, lineEnd).split("\n");
        let modifiedLines: string[];
        if (e.shiftKey) {
          modifiedLines = lines.map((l) =>
            l.startsWith("    ") ? l.substring(4) : l.startsWith("  ") ? l.substring(2) : l.replace(/^\t/, "")
          );
        } else {
          modifiedLines = lines.map((l) => "    " + l);
        }
        const replacement = modifiedLines.join("\n");
        const newContent = content.substring(0, lineStart) + replacement + content.substring(lineEnd);
        setContent(newContent);
        setIsSaved(false);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart + replacement.length);
        }, 0);
        return;
      }

      // Single line tab / shift-tab handling
      const currentLine = content.substring(lineStart, lineEnd);

      // 1. Numbered List: ^(\s*)(\d+)\.\s*(.*)$
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (numberMatch) {
        const [, indent, numStr, rest] = numberMatch;
        if (e.shiftKey) {
          // Shift+Tab: Outdent
          if (indent.length >= 2) {
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const prevNum = getPrecedingNumber(content, lineStart, newIndent);
            const newNum = prevNum + 1;
            const newLine = `${newIndent}${newNum}. ${rest}`;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = rest.trim() ? lineStart + newLine.length : lineStart + `${newIndent}${newNum}. `.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
          }
        } else {
          // Tab: Indent to start/continue a sub-list
          const newIndent = indent + "    ";
          const prevNum = getPrecedingNumber(content, lineStart, newIndent);
          const newNum = prevNum + 1; // Resets to 1 if no preceding item at this indent
          const newLine = `${newIndent}${newNum}. ${rest}`;
          const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
          setContent(newContent);
          setIsSaved(false);
          const newCursor = rest.trim() ? lineStart + newLine.length : lineStart + `${newIndent}${newNum}. `.length;
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
          }, 0);
        }
        return;
      }

      // 2. Task List: ^(\s*)([-*+]\s+\[[ xX]?\]\s*)(.*)$
      const taskMatch = currentLine.match(/^(\s*)([-*+]\s+\[[ xX]?\]\s*)(.*)$/);
      if (taskMatch) {
        const [, indent, box, rest] = taskMatch;
        if (e.shiftKey) {
          if (indent.length >= 2) {
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const newLine = `${newIndent}${box}${rest}`;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + newLine.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
          }
        } else {
          const newIndent = indent + "    ";
          const newLine = `${newIndent}${box}${rest}`;
          const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
          setContent(newContent);
          setIsSaved(false);
          const newCursor = lineStart + newLine.length;
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
          }, 0);
        }
        return;
      }

      // 3. Bullet List: ^(\s*)([-*+]\s+)(.*)$
      const bulletMatch = currentLine.match(/^(\s*)([-*+]\s+)(.*)$/);
      if (bulletMatch) {
        const [, indent, bullet, rest] = bulletMatch;
        if (e.shiftKey) {
          if (indent.length >= 2) {
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const newLine = `${newIndent}${bullet}${rest}`;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + newLine.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
          }
        } else {
          const newIndent = indent + "    ";
          const newLine = `${newIndent}${bullet}${rest}`;
          const newContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
          setContent(newContent);
          setIsSaved(false);
          const newCursor = lineStart + newLine.length;
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
          }, 0);
        }
        return;
      }

      // 4. Regular Text (not in a list)
      if (e.shiftKey) {
        if (currentLine.startsWith("    ")) {
          const newContent = content.substring(0, lineStart) + currentLine.substring(4) + content.substring(lineEnd);
          setContent(newContent);
          setIsSaved(false);
          const newCursor = Math.max(lineStart, start - 4);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
          }, 0);
        } else if (currentLine.startsWith("  ")) {
          const newContent = content.substring(0, lineStart) + currentLine.substring(2) + content.substring(lineEnd);
          setContent(newContent);
          setIsSaved(false);
          const newCursor = Math.max(lineStart, start - 2);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
          }, 0);
        }
      } else {
        const spaces = "    ";
        const newContent = content.substring(0, start) + spaces + content.substring(end);
        setContent(newContent);
        setIsSaved(false);
        const newCursor = start + spaces.length;
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
      }
      return;
    }

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
        const newContent = content.substring(0, cursor) + nextPrefix + content.substring(cursor);
        setContent(newContent);
        setIsSaved(false);
        const newCursorPos = cursor + nextPrefix.length;
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
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
        const indentMatch = prefix.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";
        if (!rest.trim()) {
          // If indented, outdent on Enter
          if (indent.length >= 2) {
            e.preventDefault();
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const newLine = `${newIndent}- [ ] `;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(actualLineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + newLine.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
            return;
          }
          clearLine();
          return;
        }

        insertNext(`\n${indent}- [ ] `);
        return;
      }

      // 2. Numbered List: 1. test
      const numberMatch = textBeforeCursor.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        const [, indent, numStr, rest] = numberMatch;
        if (!rest.trim()) {
          // If indented (nested sub-list), outdent back to parent level on Enter
          if (indent.length >= 2) {
            e.preventDefault();
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const prevNum = getPrecedingNumber(content, lineStart, newIndent);
            const newNum = prevNum + 1;
            const newLine = `${newIndent}${newNum}. `;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(actualLineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + newLine.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
            return;
          }
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
          if (indent.length >= 2) {
            e.preventDefault();
            const newIndent = indent.length >= 4 ? indent.substring(4) : "";
            const newLine = `${newIndent}${bulletSymbol} `;
            const newContent = content.substring(0, lineStart) + newLine + content.substring(actualLineEnd);
            setContent(newContent);
            setIsSaved(false);
            const newCursor = lineStart + newLine.length;
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(newCursor, newCursor);
            }, 0);
            return;
          }
          clearLine();
          return;
        }

        insertNext(`\n${indent}${bulletSymbol} `);
        return;
      }
    }
  };

  const renderTagsManager = () => (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-[11px] group hover:border-white/[0.15] transition-colors"
        >
          <span className="text-neutral-500">#</span>
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => handleRemoveTag(tag)}
            className="text-neutral-500 hover:text-neutral-300 ml-0.5 text-[10px]"
            title="Remove tag"
          >
            ×
          </button>
        </span>
      ))}

      {/* Inline Add Tag */}
      <div className="relative">
        <input
          type="text"
          placeholder="+ tag"
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
          className="bg-transparent border border-dashed border-white/[0.1] rounded-md px-2 py-0.5 text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-white/[0.3] w-20 transition-colors"
        />

        {/* Tag Suggestions Dropdown */}
        {isTagSuggestionsOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-44 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 max-h-44 overflow-y-auto p-1 text-xs backdrop-blur-xl">
            <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 border-b border-neutral-800/60">
              Existing Tags
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
                  className="w-full text-left px-2 py-1 rounded-md hover:bg-neutral-800 text-neutral-300 text-[11px] flex items-center justify-between transition-colors"
                >
                  <span>#{suggestedTag}</span>
                  <span className="text-[9px] text-neutral-500">+ add</span>
                </button>
              ))}
            {availableTags.filter(
              (t) =>
                !tags.includes(t) &&
                (!tagInput.trim() ||
                  t.toLowerCase().includes(tagInput.trim().toLowerCase().replace(/^#/, "")))
            ).length === 0 && (
                <div className="px-2 py-2 text-[10px] text-neutral-500 text-center">
                  {tagInput.trim() ? "Press Enter to create" : "No other tags"}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] text-neutral-100 overflow-hidden">
      {/* Zen Slim Header Bar */}
      <div className="h-12 border-b border-white/[0.06] bg-[#0c0d10]/70 backdrop-blur-xl px-5 sm:px-8 flex items-center justify-between shrink-0 select-none">
        {/* Left: Breadcrumbs & Status */}
        <div className="flex items-center gap-2.5 text-xs text-neutral-400">
          {/* Folder Dropdown Selector */}
          <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsFolderMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.05] text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Change Folder"
            >
              <Folder className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-medium text-neutral-300">{folder || "General"}</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {isFolderMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-1 text-xs backdrop-blur-xl">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800/60">
                  Assign Folder
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFolder(undefined);
                    setIsFolderMenuOpen(false);
                    onSave({ ...note, folder: undefined });
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 flex items-center justify-between text-xs transition-colors ${!folder ? "text-white font-medium bg-neutral-800/50" : "text-neutral-400"
                    }`}
                >
                  <span>General</span>
                  {!folder && <span className="text-neutral-400">✓</span>}
                </button>
                {folders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFolder(f);
                      setIsFolderMenuOpen(false);
                      onSave({ ...note, folder: f });
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 flex items-center justify-between text-xs transition-colors ${folder === f ? "text-white font-medium bg-neutral-800/50" : "text-neutral-400"
                      }`}
                  >
                    <span className="truncate">{f}</span>
                    {folder === f && <span className="text-neutral-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-neutral-700">/</span>
          <span className="text-neutral-500 font-mono text-[11px] truncate max-w-[160px] sm:max-w-[220px]">
            {slug}
          </span>

          {/* Saved Status Indicator */}
          <div className="ml-1 sm:ml-2 flex items-center">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>Saved</span>
              </span>
            ) : (
              <button
                onClick={handleManualSave}
                title="Click to save (⌘S)"
                className="inline-flex items-center gap-1.5 text-[11px] text-amber-400/90 hover:text-amber-300 px-2 py-0.5 rounded-md hover:bg-amber-500/10 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Unsaved changes</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: View Mode Toggle & Subtle Actions */}
        <div className="flex items-center gap-2">
          {/* Hide/Unhide Formatting Toolbar Toggle */}
          {viewMode !== "preview" && (
            <button
              onClick={toggleToolbar}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${showToolbar
                ? "bg-white/[0.1] text-white border-white/[0.18] shadow-xs"
                : "bg-white/[0.03] text-neutral-400 hover:text-neutral-200 border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              title={showToolbar ? "Hide Formatting Toolbar" : "Show Formatting Toolbar"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showToolbar ? "Hide Toolbar" : "Toolbar"}</span>
            </button>
          )}

          {/* Segmented View Mode (Edit & Preview on Mobile, Split on Desktop) */}
          <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs ${
                viewMode === "edit"
                  ? "bg-white/[0.1] text-white font-medium shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Edit Mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {/* Split View Button (Hidden on Mobile) */}
            <button
              onClick={() => setViewMode("split")}
              className={`hidden md:flex px-2.5 py-1 rounded-md items-center gap-1.5 transition-all text-xs ${
                viewMode === "split"
                  ? "bg-white/[0.1] text-white font-medium shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Split View Mode"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            <button
              onClick={onTogglePreview || (() => setViewMode(viewMode === "preview" ? (isMobileScreen ? "edit" : "split") : "preview"))}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs ${
                viewMode === "preview"
                  ? "bg-white/[0.1] text-white font-medium shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Preview Mode (Ctrl+P)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* Subtle Publish Button */}
          <button
            onClick={() => onOpenPublish(note)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${note.is_published
              ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40"
              : "border-white/[0.06] bg-white/[0.03] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
              }`}
            title={note.is_published ? "Manage Published Note" : "Publish Note to Web"}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{note.is_published ? "Published" : "Publish"}</span>
          </button>

          {/* Subtle Export Button */}
          <button
            onClick={() => downloadFile(`${note.slug}.md`, formatNoteToMarkdown(note))}
            className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] transition-colors"
            title="Download .md File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Collapsible Formatting Toolbar (Hide / Unhide) */}
      {showToolbar && viewMode !== "preview" && (
        <div className="h-10 border-b border-white/[0.06] bg-[#0c0d10]/90 backdrop-blur-xl px-5 sm:px-8 flex items-center gap-1 text-xs overflow-x-auto shrink-0 select-none">
          {/* Bold, Italic, Strike */}
          <button
            type="button"
            onClick={() => handleInsertText("**", "**")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("*", "*")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("~~", "~~")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/[0.08] mx-1 shrink-0" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => handleToggleHeading(1)}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-bold text-[11px]"
            title="Heading 1 (#)"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => handleToggleHeading(2)}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-bold text-[11px]"
            title="Heading 2 (##)"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => handleToggleHeading(3)}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-bold text-[11px]"
            title="Heading 3 (###)"
          >
            H3
          </button>

          <div className="h-4 w-px bg-white/[0.08] mx-1 shrink-0" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => handleToggleList("task")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Task Checklist (- [ ])"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleList("bullet")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Bullet List (-)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleList("number")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Numbered List (1.)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/[0.08] mx-1 shrink-0" />

          {/* Insert Elements */}
          <button
            type="button"
            onClick={() => handleInsertText("\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n\n")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Insert Table"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("[", "](https://)")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Insert Link [title](url)"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("[[", "]]")}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-mono text-[11px]"
            title="Wikilink [[note]]"
          >
            [[ ]]
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("![Alt text](", ")")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Insert Image (![alt](url))"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleBlockquote}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Blockquote (>)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("> [!NOTE]\n> ")}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors text-[11px] font-medium"
            title="Callout Box"
          >
            Callout
          </button>

          <div className="h-4 w-px bg-white/[0.08] mx-1 shrink-0" />

          {/* Code, Math, Mermaid */}
          <button
            type="button"
            onClick={() => handleInsertText("`", "`")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-mono text-[11px]"
            title="Inline Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("\n```javascript\n// Write code here\n```\n")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Code Block (```)"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("$\\sqrt{x}$")}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-mono text-[11px]"
            title="Inline Math ($...$)"
          >
            √x
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("$$\n", "\n$$")}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors font-mono text-[11px]"
            title="LaTeX Block Math ($$)"
          >
            $$
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("```mermaid\ngraph TD\n    A[Start] --> B[Finish]\n```\n")}
            className="px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors text-[11px]"
            title="Mermaid Diagram"
          >
            Diagram
          </button>
          <button
            type="button"
            onClick={() => handleInsertText("\n---\n")}
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Divider (---)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace */}
      {viewMode === "split" ? (
        /* Split View: Balanced Two-Column / Mobile Stacked Layout */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Editor */}
          <div className="flex-1 h-full overflow-y-auto border-b md:border-b-0 md:border-r border-white/[0.06] flex flex-col">
            <div className="max-w-2xl w-full mx-auto px-6 py-8 flex flex-col flex-1">
              <input
                ref={titleInputRef}
                type="text"
                placeholder="Untitled Note"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(generateSlug(e.target.value));
                  setIsSaved(false);
                }}
                className="w-full bg-transparent text-2xl font-bold text-neutral-100 placeholder-neutral-700 tracking-tight focus:outline-none mb-3"
              />

              {/* Tags in Split View with full Add/Remove capabilities */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 pb-4 border-b border-white/[0.06] mb-5">
                {renderTagsManager()}
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setIsSaved(false);
                  handleContentOrSelectionChange();
                }}
                onClick={handleContentOrSelectionChange}
                onMouseUp={handleContentOrSelectionChange}
                onPaste={handlePaste}
                onKeyUp={(e) => {
                  if (
                    isSlashOpenRef.current &&
                    (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape" || e.key === "Tab")
                  ) {
                    return;
                  }
                  handleContentOrSelectionChange();
                }}
                onSelect={() => {
                  if (isSlashOpenRef.current) return;
                  handleContentOrSelectionChange();
                }}
                onScroll={() => {
                  if (isSlashOpen) updateSlashPosition();
                  if (isSelectionToolbarOpen) updateSelectionPosition();
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Start writing, or type '/' for commands..."
                className="w-full flex-1 bg-transparent text-neutral-200 font-mono text-[14px] leading-[1.8] resize-none focus:outline-none selection:bg-neutral-700 selection:text-white placeholder-neutral-700 min-h-[350px]"
              />
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="flex-1 h-full overflow-y-auto bg-[#08080a]/50">
            <div className="max-w-2xl w-full mx-auto px-6 py-8">
              <h1 className="text-2xl font-bold text-neutral-100 tracking-tight mb-3">
                {title || "Untitled Note"}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 pb-4 border-b border-white/[0.06] mb-6">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-[11px]"
                  >
                    <span className="text-neutral-500">#</span>
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
              <MarkdownRenderer content={content} onToggleTask={handleToggleTask} />
            </div>
          </div>
        </div>
      ) : viewMode === "edit" ? (
        /* Edit Mode: Breathable Centered Document Column */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 sm:px-12 py-10 min-h-full flex flex-col">
            {/* Document Title */}
            <input
              ref={titleInputRef}
              type="text"
              placeholder="Untitled Note"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSlug(generateSlug(e.target.value));
                setIsSaved(false);
              }}
              className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-neutral-100 placeholder-neutral-700 tracking-tight focus:outline-none mb-3"
            />

            {/* Document Metadata Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 pb-5 border-b border-white/[0.06]">
              {renderTagsManager()}

              {/* Reading Stats */}
              <div className="ml-auto flex items-center gap-3 text-neutral-500 text-[11px] font-mono">
                <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
                <span>•</span>
                <span>{Math.max(1, Math.ceil((content.trim() ? content.trim().split(/\s+/).length : 0) / 200))} min read</span>
              </div>
            </div>

            {/* Document Content Textarea */}
            <div className="flex-1 mt-6 flex flex-col min-h-[400px]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setIsSaved(false);
                  handleContentOrSelectionChange();
                }}
                onClick={handleContentOrSelectionChange}
                onMouseUp={handleContentOrSelectionChange}
                onPaste={handlePaste}
                onKeyUp={(e) => {
                  if (
                    isSlashOpenRef.current &&
                    (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape" || e.key === "Tab")
                  ) {
                    return;
                  }
                  handleContentOrSelectionChange();
                }}
                onSelect={() => {
                  if (isSlashOpenRef.current) return;
                  handleContentOrSelectionChange();
                }}
                onScroll={() => {
                  if (isSlashOpen) updateSlashPosition();
                  if (isSelectionToolbarOpen) updateSelectionPosition();
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Start writing, or type '/' for commands..."
                className="w-full flex-1 bg-transparent text-neutral-200 font-mono text-[14.5px] leading-[1.8] resize-none focus:outline-none selection:bg-neutral-700 selection:text-white placeholder-neutral-700"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Preview Mode: Breathable Centered Rendered Document */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 sm:px-12 py-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight mb-3">
              {title || "Untitled Note"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 pb-5 border-b border-white/[0.06] mb-8">
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-[11px]"
                  >
                    <span className="text-neutral-500">#</span>
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3 text-neutral-500 text-[11px] font-mono">
                <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
                <span>•</span>
                <span>{Math.max(1, Math.ceil((content.trim() ? content.trim().split(/\s+/).length : 0) / 200))} min read</span>
              </div>
            </div>
            <MarkdownRenderer content={content} onToggleTask={handleToggleTask} />
          </div>
        </div>
      )}

      {/* Notion-Style Slash Command Menu (Phase 2) */}
      <SlashCommandMenu
        isOpen={isSlashOpen}
        position={slashPosition}
        query={slashQuery}
        selectedIndex={slashSelectedIndex}
        onSelect={executeSlashCommand}
        onClose={() => setIsSlashOpen(false)}
        onHoverIndex={setSlashSelectedIndex}
      />

      {/* Floating Selection Toolbar (Phase 4) */}
      <FloatingSelectionToolbar
        isOpen={isSelectionToolbarOpen}
        position={selectionToolbarPosition}
        onAction={handleSelectionAction}
      />
    </div>
  );
};
