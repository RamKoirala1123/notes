import Dexie, { Table } from "dexie";
import { Note, Artifact, Todo, TodoList } from "./types";
import { INITIAL_DEMO_NOTES, INITIAL_DEMO_TODOS } from "./demo-data";

export class MyNotesDatabase extends Dexie {
  notes!: Table<Note, number>;
  artifacts!: Table<Artifact, number>;
  todos!: Table<Todo, number>;
  todoLists!: Table<TodoList, number>;

  constructor() {
    super("MyNotesNextDB");
    this.version(2).stores({
      notes: "++id, &slug, *tags, updated_at, is_published",
      artifacts: "++id, &sha256, note_id",
      todos: "++id, completed, priority, *tags, updated_at",
    });
    this.version(3).stores({
      notes: "++id, &slug, *tags, updated_at, is_published, folder",
    });
    this.version(4).stores({
      notes: "++id, slug, *tags, updated_at, is_published, folder",
    }).upgrade(async (tx) => {
      const seenSlugs = new Set<string>();
      await tx.table("notes").toCollection().modify((note: any) => {
        if (!note.slug) {
          note.slug = `note-${note.id || Date.now()}`;
        }
        if (seenSlugs.has(note.slug)) {
          note.slug = `${note.slug}-${note.id || Date.now()}`;
        }
        seenSlugs.add(note.slug);
      });
    });
    this.version(5).stores({
      todoLists: "++id, title, updated_at",
      todos: "++id, list_id, completed, priority, *tags, updated_at",
    }).upgrade(async (tx) => {
      const count = await tx.table("todoLists").count();
      let defaultId = 1;
      if (count === 0) {
        defaultId = await tx.table("todoLists").add({
          title: "Homework",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await tx.table("todoLists").add({
          title: "Study",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      await tx.table("todos").toCollection().modify((todo: any) => {
        if (!todo.list_id) {
          todo.list_id = defaultId;
        }
      });
    });
    this.version(6).stores({
      todos: "++id, list_id, completed, priority, *tags, order, updated_at",
    }).upgrade(async (tx) => {
      let idx = 0;
      await tx.table("todos").toCollection().modify((todo: any) => {
        if (todo.order === undefined) {
          todo.order = idx++;
        }
      });
    });
  }
}

export const db = new MyNotesDatabase();

/**
 * Initialize seed data if the database is empty.
 */
export async function ensureSeeded(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const notesCount = await db.notes.count();
    if (notesCount === 0) {
      await db.notes.bulkAdd(INITIAL_DEMO_NOTES);
      console.log("Database seeded with welcome note.");
    }

    const todoListsCount = await db.todoLists.count();
    if (todoListsCount === 0) {
      await db.todoLists.add({
        title: "My Tasks",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Automatically remove legacy demo todos if present in user browser storage
    const legacyDemoTitles = [
      "Complete Math assignment exercises 1-15",
      "Write essay draft on Renewable Energy",
      "Review Biology Chapter 4 flashcards",
      "Practice Next.js Server Components & Turbopack",
      "Deploy MyNotes Next.js to Vercel custom domain",
      "Organize project notes using Wikilinks [[math-and-diagrams]]",
      "Explore Markdown list auto-continuation feature",
    ];

    await db.todos
      .filter((todo) => legacyDemoTitles.includes(todo.title))
      .delete();
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}

/**
 * Reset database to initial state.
 */
export async function resetDatabaseToDemo(): Promise<void> {
  await db.notes.clear();
  await db.artifacts.clear();
  await db.todos.clear();
  await db.todoLists.clear();
  await db.notes.bulkAdd(INITIAL_DEMO_NOTES);

  await db.todoLists.add({
    title: "My Tasks",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
