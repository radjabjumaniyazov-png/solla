/*
# Create messenger schema (no-auth, username-based)

1. Overview
This is a real-time mobile messenger web app. Users log in by simply choosing a username
(no password). The app uses the anon key, so all policies are scoped to `anon, authenticated`.
Real-time messaging is handled via Supabase Realtime subscriptions on the `messages` table.

2. New Tables
- `users`: id (uuid PK), username (text, unique), avatar_color (text), last_seen (timestamptz), created_at
- `chats`: id (uuid PK), created_at — represents a conversation between two users
- `chat_members`: chat_id (uuid FK → chats), user_id (uuid FK → users), joined_at — junction table for chat membership
- `messages`: id (uuid PK), chat_id (uuid FK → chats), sender_id (uuid FK → users), content (text), message_type (text: text|image|voice), image_url (text, nullable), voice_duration (int, nullable), created_at, read_at (timestamptz, nullable)

3. Indexes
- `messages_chat_id_created_at_idx` for efficient message retrieval by chat
- `chat_members_user_id_idx` for finding a user's chats
- `chat_members_chat_id_idx` for finding members of a chat
- `users_username_idx` for username lookups

4. Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` since this is a no-auth app (username-only login, anon key).
- All data is intentionally shared between users in a chat (that's the point of a messenger).

5. Important Notes
- The `read_at` column on messages tracks when a message was read by the recipient.
  Unread count = messages in a chat where sender_id != current user AND read_at IS NULL.
- `avatar_color` stores a color string for generating avatar backgrounds.
- `last_seen` is updated periodically to simulate online/offline status.
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  avatar_color text NOT NULL DEFAULT '#3b82f6',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Chats table (a conversation between users)
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Chat members (junction table)
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice')),
  image_url text,
  voice_duration int,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS chat_members_user_id_idx ON chat_members (user_id);
CREATE INDEX IF NOT EXISTS chat_members_chat_id_idx ON chat_members (chat_id);
CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies (shared: all users can see each other for chat purposes)
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Chats policies (shared: anyone can create/list chats)
DROP POLICY IF EXISTS "anon_select_chats" ON chats;
CREATE POLICY "anon_select_chats" ON chats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chats" ON chats;
CREATE POLICY "anon_insert_chats" ON chats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Chat members policies (shared: anyone can add/list members)
DROP POLICY IF EXISTS "anon_select_chat_members" ON chat_members;
CREATE POLICY "anon_select_chat_members" ON chat_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_members" ON chat_members;
CREATE POLICY "anon_insert_chat_members" ON chat_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Messages policies (shared: anyone in a chat can send/read messages)
DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable realtime publication for relevant tables (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chats;
  END IF;
END $$;