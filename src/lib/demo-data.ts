import { Note, Todo } from "./types";

export const INITIAL_DEMO_NOTES: Omit<Note, "id">[] = [
  {
    slug: "welcome-to-mynotes",
    title: "Welcome to MyNotes Next.js",
    content: `# 🚀 Welcome to MyNotes (Next.js Edition)

**MyNotes Next.js** is a modern, privacy-focused note manager that stores everything locally in your browser using **IndexedDB**. You can deploy it as a fully static web application on **Vercel**, **GitHub Pages**, or host it on your custom domain!

> [!NOTE]
> All your data lives inside your browser storage. Nothing is sent to external servers unless you choose to export or publish your notes.

---

### ✨ Key Features Included

- 📝 **Full Markdown Support**: Write with GFM (GitHub Flavored Markdown), task lists, tables, and callouts.
- 🔗 **Wikilinks**: Connect ideas seamlessly using \`[[Wikilink]]\` syntax. Try opening [[math-and-diagrams]] or [[organizing-with-tags]]!
- 🧮 **LaTeX Math**: Render beautiful formulas inline like $E = mc^2$ or display math equations.
- 📊 **Mermaid Diagrams**: Visual flowcharts, Gantt charts, and sequence diagrams right in your notes.
- 🏷️ **Tag Management**: Categorize notes easily with automated tag extraction and interactive sidebars.
- 📤 **Import & Export**: Seamlessly import/export full directories of \`.md\` files with YAML frontmatter.
- 🌐 **Public Publishing**: Generate static public share links or download standalone HTML files!

---

### 💡 Quick Keyboard Shortcuts

- \`⌘ + K\` or \`/\` : Quick Search
- \`⌘ + N\` : Create New Note
- \`⌘ + S\` : Save Note
- \`⌘ + P\` : Preview Mode Toggle
`,
    tags: ["welcome", "getting-started", "guide"],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    is_published: true,
    published_at: new Date().toISOString(),
  },
  {
    slug: "math-and-diagrams",
    title: "Math Formulas & Mermaid Diagrams",
    content: `# 🧮 Math Formulas & Visual Diagrams

MyNotes Next supports rich mathematical expressions powered by KaTeX and interactive diagrams powered by Mermaid.

---

### 1. Mathematical Equations

Inline equation: The famous Euler's identity is $e^{i\\pi} + 1 = 0$.

Display Math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Matrix calculations:
$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}
$$

---

### 2. Mermaid Diagrams

Flowchart diagram:

\`\`\`mermaid
graph TD
    A[Start Note Creation] --> B{Draft Content}
    B -->|Add Wikilinks| C[Connect Knowledge]
    B -->|Add Tags| D[Organize Taxonomy]
    C --> E[Save to IndexedDB]
    D --> E
    E --> F[Publish or Export .md]
\`\`\`

Sequence Diagram:

\`\`\`mermaid
sequenceDiagram
    autonumber
    User->>Client: Edit Markdown Note
    Client->>IndexedDB: Auto-save state
    IndexedDB-->>Client: Confirm persistence
    Client->>User: Display "Saved" badge
\`\`\`

---

> [!TIP]
> Return to [[welcome-to-mynotes]] to explore more capabilities!
`,
    tags: ["math", "diagrams", "katex", "mermaid"],
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date().toISOString(),
    is_published: false,
  },
  {
    slug: "organizing-with-tags",
    title: "Organizing Knowledge with Tags & Links",
    content: `# 🏷️ Organizing Knowledge with Tags & Links

Building a personal knowledge graph is effortless in MyNotes.

### 1. Using Tags

You can tag your notes in two ways:
1. **Frontmatter tags**: Add \`tags: ["ideas", "projects"]\` at the top of your file when importing.
2. **Inline hashtags**: Add tags like \`#project\` or \`#research\` anywhere in your note.

### 2. Wikilinks (\`[[slug]]\`)

Wikilinks allow bidirectionally linking notes together:
- Link to [[welcome-to-mynotes]]
- Link to [[math-and-diagrams]]

> [!IMPORTANT]
> If a linked note does not exist yet, clicking the link will prompt you to create it instantly!
`,
    tags: ["productivity", "guide", "knowledge-base"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_published: false,
  },
];

export const INITIAL_DEMO_TODOS: Omit<Todo, "id">[] = [
  {
    title: "Deploy MyNotes Next.js to Vercel custom domain",
    completed: false,
    priority: "high",
    due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    tags: ["deployment", "vercel"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: "Organize project notes using Wikilinks [[math-and-diagrams]]",
    completed: true,
    priority: "medium",
    tags: ["organization"],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: "Explore Markdown list auto-continuation feature",
    completed: true,
    priority: "low",
    tags: ["feature"],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];
