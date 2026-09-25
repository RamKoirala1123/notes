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
      console.log("Database seeded with demo notes.");
    }

    const todoListsCount = await db.todoLists.count();
    let homeworkId = 1;
    let studyId = 2;
    if (todoListsCount === 0) {
      homeworkId = await db.todoLists.add({
        title: "Homework",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      studyId = await db.todoLists.add({
        title: "Study",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      const lists = await db.todoLists.toArray();
      if (lists.length > 0) homeworkId = lists[0].id || 1;
      if (lists.length > 1) studyId = lists[1].id || 2;
    }

    const todosCount = await db.todos.count();
    if (todosCount === 0) {
      await db.todos.bulkAdd([
        {
          title: "Complete Math assignment exercises 1-15",
          description: "Focus on quadratic equations and graph sketches from page 42.",
          completed: false,
          priority: "high",
          list_id: homeworkId,
          order: 0,
          due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          tags: ["math", "homework"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          title: "Write essay draft on Renewable Energy",
          description: "Include solar, wind, and geothermal comparisons with citations.",
          completed: false,
          priority: "medium",
          list_id: homeworkId,
          order: 1,
          tags: ["english", "essay"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          title: "Review Biology Chapter 4 flashcards",
          description: "Cellular respiration, Krebs cycle, and mitochondrial ATP synthesis.",
          completed: true,
          priority: "medium",
          list_id: studyId,
          order: 0,
          tags: ["biology", "exam"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          title: "Practice Next.js Server Components & Turbopack",
          description: "Experiment with async layout params, caching headers, and dynamic routes.",
          completed: false,
          priority: "high",
          list_id: studyId,
          order: 1,
          tags: ["coding", "nextjs"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
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
  await db.todoLists.clear();
  await db.notes.bulkAdd(INITIAL_DEMO_NOTES);

  const homeworkId = await db.todoLists.add({
    title: "Homework",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const studyId = await db.todoLists.add({
    title: "Study",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await db.todos.bulkAdd([
    {
      title: "Complete Math assignment exercises 1-15",
      description: "Focus on quadratic equations and graph sketches from page 42.",
      completed: false,
      priority: "high",
      list_id: homeworkId,
      order: 0,
      due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      tags: ["math", "homework"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      title: "Write essay draft on Renewable Energy",
      description: "Include solar, wind, and geothermal comparisons with citations.",
      completed: false,
      priority: "medium",
      list_id: homeworkId,
      order: 1,
      tags: ["english", "essay"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      title: "Review Biology Chapter 4 flashcards",
      description: "Cellular respiration, Krebs cycle, and mitochondrial ATP synthesis.",
      completed: true,
      priority: "medium",
      list_id: studyId,
      order: 0,
      tags: ["biology", "exam"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      title: "Practice Next.js Server Components & Turbopack",
      description: "Experiment with async layout params, caching headers, and dynamic routes.",
      completed: false,
      priority: "high",
      list_id: studyId,
      order: 1,
      tags: ["coding", "nextjs"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}
