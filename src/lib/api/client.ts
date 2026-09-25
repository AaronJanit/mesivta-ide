// Tiny typed fetch wrapper for the client. All routes are same-origin.
async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

export interface UserDTO {
  id: string;
  username: string;
}
export interface ProjectDTO {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
export interface FileDTO {
  id: string;
  project_id: string;
  parent_folder_id: string | null;
  name: string;
  type: "file" | "folder";
  content: string | null;
  created_at: string;
  updated_at: string;
  children?: FileDTO[];
}
export interface ChatDTO {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
export interface MessageDTO {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export const api = {
  auth: {
    me: () => req<{ user: UserDTO | null }>("/api/auth/me"),
    login: (code: string) =>
      req<{ user: UserDTO }>("/api/auth/login", { method: "POST", body: JSON.stringify({ code }) }),
    logout: () => req<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  },
  projects: {
    list: () => req<{ projects: ProjectDTO[] }>("/api/projects"),
    create: (name: string) => req<{ project: ProjectDTO }>("/api/projects", { method: "POST", body: JSON.stringify({ name }) }),
    rename: (id: string, name: string) => req<{ ok: true }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    remove: (id: string) => req<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
  },
  files: {
    list: (projectId: string) => req<{ tree: FileDTO[] }>(`/api/projects/${projectId}/files`),
    create: (projectId: string, body: { parent_folder_id: string | null; name: string; type: "file" | "folder"; content?: string }) =>
      req<{ node: FileDTO }>(`/api/projects/${projectId}/files`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, patch: { name?: string; content?: string; parent_folder_id?: string | null }) =>
      req<{ ok: true }>(`/api/files/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id: string) => req<{ ok: true }>(`/api/files/${id}`, { method: "DELETE" }),
  },
  chats: {
    list: (projectId: string) => req<{ chats: ChatDTO[] }>(`/api/projects/${projectId}/chats`),
    create: (projectId: string, title?: string) =>
      req<{ chat: ChatDTO }>(`/api/projects/${projectId}/chats`, { method: "POST", body: JSON.stringify({ title }) }),
    rename: (id: string, title: string) => req<{ ok: true }>(`/api/chats/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
    remove: (id: string) => req<{ ok: true }>(`/api/chats/${id}`, { method: "DELETE" }),
  },
  vibes: {
    progress: () =>
      req<{
        stages: Record<
          string,
          { done: boolean; fileId: string; updatedAt: string; fileName?: string; projectName?: string }
        >;
      }>("/api/vibes"),
    saveDoc: (stage: string, fields: Record<string, string>) =>
      req<{ ok: true; fileName: string; projectName: string }>("/api/vibes/save-doc", {
        method: "POST",
        body: JSON.stringify({ stage, fields }),
      }),
  },
  messages: {
    list: (chatId: string) => req<{ messages: MessageDTO[] }>(`/api/chats/${chatId}/messages`),
    add: (chatId: string, role: "user" | "assistant" | "system", content: string) =>
      req<{ message: MessageDTO }>(`/api/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify({ role, content }) }),
    /** Delete every message in the chat from the given ISO timestamp (inclusive). */
    deleteFrom: (chatId: string, fromIso: string) =>
      req<{ ok: true }>(`/api/chats/${chatId}/messages`, { method: "DELETE", body: JSON.stringify({ from: fromIso }) }),
  },
};