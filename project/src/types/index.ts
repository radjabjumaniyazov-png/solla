export type MessageType = 'text' | 'image' | 'voice';

export interface User {
  id: string;
  username: string;
  avatar_color: string;
  avatar_url: string | null;
  last_seen: string;
  created_at: string;
}

export interface Chat {
  id: string;
  created_at: string;
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  image_url: string | null;
  voice_duration: number | null;
  created_at: string;
  read_at: string | null;
}

export interface ChatWithDetails {
  chat_id: string;
  other_user: User;
  last_message: Message | null;
  unread_count: number;
}
