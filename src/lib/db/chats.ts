import { createAdminClient } from "@/lib/supabase/server";
import type { Chat, Message, ChatRole } from "@/lib/db/types";

function client() {
  return createAdminClient();
}

async function ownProject(userId: string, projectId: string): Promise<boolean> {
  const { data } = await client()
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function listChats(userId: string, projectId: string): Promise<Chat[]> {
  if (!(await ownProject(userId, projectId))) throw new Error("Project not found");
  const { data, error } = await client()
    .from("chats")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Chat[]) ?? [];
}

export async function createChat(userId: string, projectId: string, title = "New chat"): Promise<Chat> {
  if (!(await ownProject(userId, projectId))) throw new Error("Project not found");
  const { data, error } = await client()
    .from("chats")
    .insert({ project_id: projectId, title })
    .select()
    .single();
  if (error) throw error;
  return data as Chat;
}

export async function renameChat(userId: string, chatId: string, title: string): Promise<void> {
  // ownership check via join: chat -> project -> user
  const { data: chat, error: ce } = await client()
    .from("chats")
    .select("project_id")
    .eq("id", chatId)
    .maybeSingle();
  if (ce || !chat) throw new Error("Chat not found");
  if (!(await ownProject(userId, chat.project_id as string))) throw new Error("Project not found");
  const { error } = await client().from("chats").update({ title }).eq("id", chatId);
  if (error) throw error;
}

export async function deleteChat(userId: string, chatId: string): Promise<void> {
  const { data: chat } = await client()
    .from("chats")
    .select("project_id")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) return;
  if (!(await ownProject(userId, chat.project_id as string))) throw new Error("Project not found");
  const { error } = await client().from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

export async function listMessages(userId: string, chatId: string): Promise<Message[]> {
  const { data: chat } = await client()
    .from("chats")
    .select("project_id")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) throw new Error("Chat not found");
  if (!(await ownProject(userId, chat.project_id as string))) throw new Error("Project not found");
  const { data, error } = await client()
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function createMessage(
  userId: string,
  chatId: string,
  role: ChatRole,
  content: string,
): Promise<Message> {
  const { data: chat } = await client()
    .from("chats")
    .select("project_id")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) throw new Error("Chat not found");
  if (!(await ownProject(userId, chat.project_id as string))) throw new Error("Project not found");
  const { data, error } = await client()
    .from("messages")
    .insert({ chat_id: chatId, role, content })
    .select()
    .single();
  if (error) throw error;
  // touch chat.updated_at
  await client().from("chats").update({}).eq("id", chatId);
  return data as Message;
}