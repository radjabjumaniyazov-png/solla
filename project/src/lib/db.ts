import { supabase } from './supabase';
import type { User, ChatWithDetails, Message, MessageType } from '@/types';

const AVATAR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1',
];

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export async function getOrCreateUser(username: string): Promise<User> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', existing.id);
    return existing as User;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ username, avatar_color: randomColor() })
    .select('*')
    .single();

  if (error) throw error;
  return data as User;
}

export async function getAllUsers(excludeId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', excludeId)
    .order('username');

  if (error) throw error;
  return (data ?? []) as User[];
}

export async function searchUsersByUsername(query: string, excludeId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${query}%`)
    .neq('id', excludeId)
    .order('username')
    .limit(20);

  if (error) throw error;
  return (data ?? []) as User[];
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.trim())
    .maybeSingle();

  if (error) throw error;
  return data as User | null;
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (error) throw error;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as User | null;
}

export async function findChatBetween(userA: string, userB: string): Promise<string | null> {
  const { data: chatsA } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', userA);

  const { data: chatsB } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', userB);

  if (!chatsA || !chatsB) return null;

  const idsA = new Set(chatsA.map((c) => c.chat_id));
  for (const c of chatsB) {
    if (idsA.has(c.chat_id)) return c.chat_id;
  }
  return null;
}

export async function createOrGetChat(userA: string, userB: string): Promise<string> {
  const existing = await findChatBetween(userA, userB);
  if (existing) return existing;

  const { data: chat, error: chatErr } = await supabase
    .from('chats')
    .insert({})
    .select('id')
    .single();

  if (chatErr) throw chatErr;

  const { error: memberErr } = await supabase
    .from('chat_members')
    .insert([
      { chat_id: chat.id, user_id: userA },
      { chat_id: chat.id, user_id: userB },
    ]);

  if (memberErr) throw memberErr;
  return chat.id;
}

export async function getChatList(userId: string): Promise<ChatWithDetails[]> {
  const { data: memberships, error: mErr } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', userId);

  if (mErr) throw mErr;
  if (!memberships || memberships.length === 0) return [];

  const chatIds = memberships.map((m) => m.chat_id);

  const { data: allMembers, error: amErr } = await supabase
    .from('chat_members')
    .select('chat_id, user_id, users!inner(id, username, avatar_color, avatar_url, last_seen, created_at)')
    .in('chat_id', chatIds)
    .neq('user_id', userId);

  if (amErr) throw amErr;

  const { data: allMessages, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });

  if (msgErr) throw msgErr;

  const result: ChatWithDetails[] = [];

  for (const m of allMembers ?? []) {
    const otherUser = (m as unknown as { users: User }).users as User;
    const chatMessages = (allMessages ?? []).filter((msg) => msg.chat_id === m.chat_id);
    const lastMessage = chatMessages.length > 0 ? (chatMessages[0] as Message) : null;
    const unreadCount = chatMessages.filter(
      (msg) => msg.sender_id !== userId && msg.read_at === null
    ).length;

    result.push({
      chat_id: m.chat_id,
      other_user: otherUser,
      last_message: lastMessage,
      unread_count: unreadCount,
    });
  }

  result.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? '';
    const bTime = b.last_message?.created_at ?? '';
    return bTime.localeCompare(aTime);
  });

  return result;
}

export async function getMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
  messageType: MessageType = 'text',
  extra?: { image_url?: string; voice_duration?: number }
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      content,
      message_type: messageType,
      image_url: extra?.image_url ?? null,
      voice_duration: extra?.voice_duration ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Message;
}

export async function markMessagesRead(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) throw error;
}

export async function updateLastSeen(userId: string): Promise<void> {
  await supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId);
}

export function isUserOnline(lastSeen: string): boolean {
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 60_000;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatLastMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
