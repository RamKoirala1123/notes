import Dexie, { Table } from "dexie";
import { Note, Artifact, Todo } from "./types";
import { INITIAL_DEMO_NOTES, INITIAL_DEMO_TODOS } from "./demo-data";

export class MyNotesDatabase extends Dexie {
  notes!: Table<Note, number>;
  artifacts!: Table<Artifact, number>;
  todos!: Table<Todo, number>;

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
      console.log("Database seeded with demo notes.");
    }

    const todosCount = await db.todos.count();
    if (todosCount === 0) {
      await db.todos.bulkAdd(INITIAL_DEMO_TODOS);
      console.log("Database seeded with demo todos.");
    }
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}

/**
 * Reset database to initial demo state.
 */
export async function resetDatabaseToDemo(): Promise<void> {
  await db.notes.clear();
  await db.artifacts.clear();
  await db.todos.clear();
  await db.notes.bulkAdd(INITIAL_DEMO_NOTES);
  await db.todos.bulkAdd(INITIAL_DEMO_TODOS);
}
