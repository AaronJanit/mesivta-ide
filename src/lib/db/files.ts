import { createAdminClient } from "@/lib/supabase/server";
import type { FileNode } from "@/lib/db/types";

function client() {
  return createAdminClient();
}

function buildTree(rows: FileNode[]): FileNode[] {
  const map = new Map<string, FileNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: FileNode[] = [];
  rows.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parent_folder_id && map.has(r.parent_folder_id)) {
      map.get(r.parent_folder_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  const sort = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(roots);
  return roots;
}

export async function listFiles(userId: string, projectId: string): Promise<FileNode[]> {
  // verify ownership via project
  const { data: proj, error: pe } = await client()
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (pe) throw pe;
  if (!proj) throw new Error("Project not found");

  const { data, error } = await client()
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw error;
  return buildTree((data as FileNode[]) ?? []);
}

export async function getFile(userId: string, fileId: string): Promise<FileNode | null> {
  const { data, error } = await client()
    .from("files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // verify ownership through project
  const { data: proj, error: pe } = await client()
    .from("projects")
    .select("id")
    .eq("id", (data as FileNode).project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (pe) throw pe;
  if (!proj) return null;
  return data as FileNode;
}

export async function createFile(
  userId: string,
  input: {
    project_id: string;
    parent_folder_id: string | null;
    name: string;
    type: "file" | "folder";
    content?: string | null;
  },
): Promise<FileNode> {
  // verify ownership
  const { data: proj, error: pe } = await client()
    .from("projects")
    .select("id")
    .eq("id", input.project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (pe) throw pe;
  if (!proj) throw new Error("Project not found");
  const { data, error } = await client()
    .from("files")
    .insert({
      project_id: input.project_id,
      parent_folder_id: input.parent_folder_id,
      name: input.name,
      type: input.type,
      content: input.type === "file" ? input.content ?? "" : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FileNode;
}

export async function updateFile(
  userId: string,
  fileId: string,
  patch: { name?: string; content?: string; parent_folder_id?: string | null },
): Promise<void> {
  const f = await getFile(userId, fileId);
  if (!f) throw new Error("File not found");
  // cycle guard for moves
  if (patch.parent_folder_id !== undefined && patch.parent_folder_id !== null) {
    if (fileId === patch.parent_folder_id) throw new Error("Cannot move a folder into itself");
    // walk up the parent chain from target to ensure it's not a descendant of fileId
    let cur: string | null = patch.parent_folder_id;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      if (cur === fileId) throw new Error("Cannot move a folder into its own descendant");
      seen.add(cur);
      const { data } = await client()
        .from("files")
        .select("parent_folder_id")
        .eq("id", cur)
        .maybeSingle();
      const parentRow = data as { parent_folder_id: string | null } | null;
      cur = parentRow?.parent_folder_id ?? null;
    }
  }
  const { error } = await client().from("files").update(patch).eq("id", fileId);
  if (error) throw error;
}

export async function deleteFile(userId: string, fileId: string): Promise<void> {
  const f = await getFile(userId, fileId);
  if (!f) throw new Error("File not found");
  const { error } = await client().from("files").delete().eq("id", fileId);
  if (error) throw error;
}