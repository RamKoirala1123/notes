import { Note, Todo } from "./types";

export const INITIAL_DEMO_NOTES: Omit<Note, "id">[] = [
  {
    slug: "welcome-to-notes",
    title: "Welcome to Notes",
    content: `# 🚀 Welcome to Notes

**Notes** is a modern, privacy-focused note manager that stores everything locally in your browser using **IndexedDB**. 

> [!NOTE]
> All your data lives inside your browser storage. Nothing is sent to external servers unless you choose to export or publish your notes.

---

### ✨ What's Possible

- 📝 **Full Markdown Support**: Write with GFM (GitHub Flavored Markdown), task lists, tables, and callouts.
- 🔗 **Wikilinks**: Connect ideas seamlessly using \`[[Wikilink]]\` syntax.
- 🧮 **LaTeX Math**: Render beautiful formulas inline like $E = mc^2$ or display math equations:
  $$ \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} $$
- 📊 **Mermaid Diagrams**: Create visual flowcharts, Gantt charts, and sequence diagrams right inside your notes:
  \`\`\`mermaid
  graph TD
      A[Start Note Creation] --> B{Draft Content}
      B -->|Add Wikilinks| C[Connect Knowledge]
      B -->|Add Tags| D[Organize Taxonomy]
      C --> E[Save to Storage]
      D --> E
  \`\`\`
- 🏷️ **Tag Management**: Categorize notes easily with automated \`#tag\` extraction and the interactive **Tags Explorer**.
- 📋 **Todo Workspace**: Manage interactive todo lists, assign priorities, due dates, and custom list categories.
- 📤 **Import & Export**: Seamlessly import/export full directories of \`.md\` files.

---

### 💡 Quick Keyboard Shortcuts

- \`⌘ + K\` or \`/\` : Quick Search & Command Palette
- \`⌘ + N\` : Create New Note
- \`⌘ + S\` : Save Note
- \`⌘ + P\` : Toggle Preview Mode
`,
    tags: ["welcome", "getting-started", "guide"],
    folder: "Home",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_published: false,
  },
];

export const INITIAL_DEMO_TODOS: Omit<Todo, "id">[] = [];
