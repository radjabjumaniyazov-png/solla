import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  getChatList,
  getAllUsers,
  searchUsersByUsername,
  createOrGetChat,
  isUserOnline,
  formatLastMessageTime,
} from '@/lib/db';
import type { ChatWithDetails, User, MessageType } from '@/types';
import { Avatar } from '@/components/Avatar';
import { Search, Plus, X, LogOut, MessageCircle, Check, CheckCheck, UserPlus, Settings } from 'lucide-react';

interface ChatListScreenProps {
  onOpenChat: (chatId: string, otherUser: User) => void;
  onOpenProfile: () => void;
}

function lastMessagePreview(type: MessageType, content: string): string {
  if (type === 'image') return '📷 Photo';
  if (type === 'voice') return '🎤 Voice message';
  return content;
}

export function ChatListScreen({ onOpenChat, onOpenProfile }: ChatListScreenProps) {
  const { currentUser, logout } = useApp();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [newChatSearch, setNewChatSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const loadChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await getChatList(currentUser.id);
      setChats(list);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('chat_list_updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => loadChats()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => loadChats()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members' },
        () => loadChats()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        () => loadChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, loadChats]);

  const handleStartChat = async (otherUser: User) => {
    if (!currentUser) return;
    try {
      const chatId = await createOrGetChat(currentUser.id, otherUser.id);
      setShowNewChat(false);
      setNewChatSearch('');
      onOpenChat(chatId, otherUser);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const openNewChat = async () => {
    if (!currentUser) return;
    try {
      const users = await getAllUsers(currentUser.id);
      setAllUsers(users);
      setShowNewChat(true);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // Debounced search in the new chat modal
  useEffect(() => {
    if (!showNewChat || !currentUser) return;
    if (!newChatSearch.trim()) {
      setSearching(false);
      getAllUsers(currentUser.id).then(setAllUsers).catch(() => {});
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchUsersByUsername(newChatSearch.trim(), currentUser.id)
        .then(setAllUsers)
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [newChatSearch, showNewChat, currentUser]);

  const filteredChats = chats.filter((c) =>
    c.other_user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#21262d] shrink-0">
        <h1 className="text-xl font-bold text-white">Mesh</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={openNewChat}
            className="p-2.5 rounded-full hover:bg-[#21262d] transition-colors text-gray-300"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenProfile}
            className="p-2.5 rounded-full hover:bg-[#21262d] transition-colors text-gray-300"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2.5 rounded-full hover:bg-[#21262d] transition-colors text-gray-300"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-2 bg-[#161b22] border-b border-[#21262d] shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-[#0d1117] text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-[#21262d] focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <p>Loading chats…</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 px-6 text-center">
            <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">
              {search ? 'No chats found' : 'No conversations yet. Tap + to start one.'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.chat_id}
              onClick={() => onOpenChat(chat.chat_id, chat.other_user)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#161b22] active:bg-[#1c2128] transition-colors text-left border-b border-[#0d1117]"
            >
              <Avatar
                name={chat.other_user.username}
                color={chat.other_user.avatar_color}
                size={52}
                online={isUserOnline(chat.other_user.last_seen)}
                avatarUrl={chat.other_user.avatar_url}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate">
                    {chat.other_user.username}
                  </span>
                  {chat.last_message && (
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {formatLastMessageTime(chat.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    {chat.last_message && chat.last_message.sender_id === currentUser?.id && (
                      chat.last_message.read_at ? (
                        <CheckCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-gray-500 shrink-0" />
                      )
                    )}
                    <span className="text-sm text-gray-400 truncate">
                      {chat.last_message
                        ? lastMessagePreview(chat.last_message.message_type, chat.last_message.content)
                        : 'No messages yet'}
                    </span>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="shrink-0 ml-2 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New chat / add contact modal */}
      {showNewChat && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#0d1117]">
          <header className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-[#21262d] shrink-0">
            <button
              onClick={() => { setShowNewChat(false); setNewChatSearch(''); }}
              className="p-2 rounded-full hover:bg-[#21262d] transition-colors text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">New Chat</h2>
          </header>
          <div className="px-4 py-2 bg-[#161b22] border-b border-[#21262d] shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                placeholder="Search by username…"
                autoFocus
                className="w-full bg-[#0d1117] text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-[#21262d] focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center h-20 text-gray-500">
                <p className="text-sm">Searching…</p>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 px-6 text-center">
                <UserPlus className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">
                  {newChatSearch
                    ? `No users found for "${newChatSearch}". Ask them to sign in with that username first.`
                    : 'No other users yet. Open another tab with a different username to start chatting!'}
                </p>
              </div>
            ) : (
              allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#161b22] active:bg-[#1c2128] transition-colors text-left border-b border-[#0d1117]"
                >
                  <Avatar
                    name={user.username}
                    color={user.avatar_color}
                    size={48}
                    online={isUserOnline(user.last_seen)}
                    avatarUrl={user.avatar_url}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-white block truncate">
                      {user.username}
                    </span>
                    <span className="text-sm text-gray-500">
                      {isUserOnline(user.last_seen) ? 'online' : 'offline'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
