export interface Note {
  id?: number;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  is_published: boolean;
  published_at?: string;
  folder?: string;
}

export interface TodoList {
  id?: number;
  title: string;
  created_at: string;
  updated_at: string;
  color?: string;
  icon?: string;
}

export interface Todo {
  id?: number;
  list_id?: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_date?: string;
  tags: string[];
  order?: number;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id?: number;
  sha256: string;
  mime_type: string;
  data: string; // Base64 data URL
  note_id: number;
}

export interface NoteFrontmatter {
  title?: string;
  slug?: string;
  date?: string;
  tags?: string[];
  folder?: string;
}

export interface ExportedNote {
  filename: string;
  content: string;
}
