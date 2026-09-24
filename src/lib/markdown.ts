import { Note, NoteFrontmatter } from "./types";

const DOS_DEVICE_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
]);

/**
 * Generate a safe, sanitized slug from a note title.
 */
export function generateSlug(title: string): string {
  let slug = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "")     // Remove non-alphanumeric except spaces & hyphens
    .replace(/\s+/g, "-")            // Replace spaces with hyphens
    .replace(/-+/g, "-")             // Collapse multiple hyphens
    .replace(/^-|-$/g, "");          // Trim hyphens

  if (!slug) {
    slug = "untitled-note";
  }

  if (DOS_DEVICE_NAMES.has(slug.toUpperCase())) {
    slug = `_${slug}`;
  }

  return slug;
}

/**
 * Extract title from Markdown content if not provided in frontmatter.
 */
export function extractTitle(content: string, defaultTitle: string = "Untitled Note"): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].trim();
  }
  return defaultTitle;
}

/**
 * Parse frontmatter block from Markdown text.
 */
export function parseFrontmatter(rawContent: string): { frontmatter: NoteFrontmatter; body: string } {
  const yamlRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = rawContent.match(yamlRegex);

  if (!match) {
    return { frontmatter: {}, body: rawContent };
  }

  const yamlStr = match[1];
  const body = rawContent.slice(match[0].length);
  const frontmatter: NoteFrontmatter = {};

  const lines = yamlStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    let value = line.slice(colonIndex + 1).trim();

    // Clean quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key === "title") frontmatter.title = value;
    else if (key === "slug") frontmatter.slug = value;
    else if (key === "date") frontmatter.date = value;
    else if (key === "tags") {
      // Parse array like ["tag1", "tag2"] or comma list
      if (value.startsWith("[") && value.endsWith("]")) {
        try {
          frontmatter.tags = JSON.parse(value);
        } catch {
          frontmatter.tags = value.slice(1, -1).split(",").map(t => t.trim().replace(/^['"]|['"]$/g, ""));
        }
      } else {
        frontmatter.tags = value.split(",").map(t => t.trim());
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Extract inline hashtags like #project or #idea from Markdown.
 */
export function extractInlineTags(content: string): string[] {
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
  const tags = new Set<string>();
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  return Array.from(tags);
}

/**
 * Convert wikilinks [[slug]] or [[slug|Display Text]] into standard Markdown links.
 */
export function processWikilinks(content: string): string {
  return content.replace(/\[\[([a-zA-Z0-9_ -]+)(?:\|([^\]]+))?\]\]/g, (_, slugOrTitle, label) => {
    const slug = generateSlug(slugOrTitle);
    const displayText = label ? label.trim() : slugOrTitle.trim();
    return `[${displayText}](/notes/${slug})`;
  });
}

/**
 * Generate a clean excerpt preview from Markdown content.
 */
export function extractExcerpt(content: string, maxLength: number = 140): string {
  const { body } = parseFrontmatter(content);
  const cleanText = body
    .replace(/^#+\s+/gm, "")         // Remove headings
    .replace(/```[\s\S]*?```/g, "")    // Remove code blocks
    .replace(/`([^`]+)`/g, "$1")       // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
    .replace(/\[\[([^\]]+)\]\]/g, "$1") // Remove wikilinks
    .replace(/[*_~>#]/g, "")          // Remove styling chars
    .replace(/\s+/g, " ")             // Collapse spaces
    .trim();

  if (cleanText.length <= maxLength) return cleanText;
  return cleanText.slice(0, maxLength).trim() + "...";
}

/**
 * Format note object as a full Markdown file with YAML frontmatter.
 */
export function formatNoteToMarkdown(note: Note): string {
  const tagsFormatted = JSON.stringify(note.tags);
  const frontmatter = `---
title: "${note.title.replace(/"/g, '\\"')}"
slug: "${note.slug}"
date: "${note.created_at}"
tags: ${tagsFormatted}
---

`;
  const { body } = parseFrontmatter(note.content);
  return frontmatter + body.trim() + "\n";
}

/**
 * Download string content as a file in browser.
 */
export function downloadFile(filename: string, content: string, mimeType: string = "text/markdown") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
