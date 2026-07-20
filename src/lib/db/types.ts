// DB row types (snake_case from Supabase) and camelCase client shapes.

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type FileType = "file" | "folder";

export interface FileNode {
  id: string;
  project_id: string;
  parent_folder_id: string | null;
  name: string;
  type: FileType;
  content: string | null;
  created_at: string;
  updated_at: string;
  // client-only children for tree rendering
  children?: FileNode[];
}

export type ChatRole = "user" | "assistant" | "system";

export interface Chat {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}