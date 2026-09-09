import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  getMessages,
  sendMessage as sendMsg,
  markMessagesRead,
  isUserOnline,
  formatTime,
} from '@/lib/db';
import type { User, Message } from '@/types';
import { Avatar } from '@/components/Avatar';
import { MessageBubble } from '@/components/MessageBubble';
import { ArrowLeft, Send, Paperclip, Mic, X, Check, CheckCheck } from 'lucide-react';

interface ChatRoomScreenProps {
  chatId: string;
  otherUser: User;
  onBack: () => void;
}

export function ChatRoomScreen({ chatId, otherUser, onBack }: ChatRoomScreenProps) {
  const { currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [otherUserOnline, setOtherUserOnline] = useState(isUserOnline(otherUser.last_seen));
  const [otherUserState, setOtherUser] = useState<User>(otherUser);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await getMessages(chatId);
      setMessages(msgs);
      if (currentUser) {
        await markMessagesRead(chatId, currentUser.id);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId, currentUser]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (currentUser && newMsg.sender_id !== currentUser.id) {
            markMessagesRead(chatId, currentUser.id);
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${otherUser.id}`,
        },
        (payload) => {
          const updatedUser = payload.new as User;
          setOtherUserOnline(isUserOnline(updatedUser.last_seen));
          setOtherUser(updatedUser);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUser, otherUser.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !currentUser || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendMsg(chatId, currentUser.id, trimmed, 'text');
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendImage = async (imageUrl: string) => {
    if (!currentUser) return;
    setShowAttach(false);
    setSending(true);
    try {
      await sendMsg(chatId, currentUser.id, '', 'image', { image_url: imageUrl });
    } catch (err) {
      console.error('Failed to send image:', err);
    } finally {
      setSending(false);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordDuration(0);
    recordTimerRef.current = setInterval(() => {
      setRecordDuration((d) => d + 1);
    }, 1000);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordDuration(0);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const sendVoiceMessage = async () => {
    if (!currentUser) return;
    const duration = recordDuration;
    cancelRecording();
    if (duration < 1) return;
    setSending(true);
    try {
      await sendMsg(chatId, currentUser.id, '', 'voice', { voice_duration: duration });
    } catch (err) {
      console.error('Failed to send voice message:', err);
    } finally {
      setSending(false);
    }
  };

  const MOCK_IMAGES = [
    'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/206359/pexels-photo-206359.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3247/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400',
  ];

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-2.5 bg-[#161b22] border-b border-[#21262d] shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-[#21262d] transition-colors text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar
          name={otherUserState.username}
          color={otherUserState.avatar_color}
          size={40}
          online={otherUserOnline}
          avatarUrl={otherUserState.avatar_url}
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white truncate leading-tight">
            {otherUserState.username}
          </h2>
          <p className="text-xs leading-tight">
            <span className={otherUserOnline ? 'text-green-400' : 'text-gray-500'}>
              {otherUserOnline ? 'online' : 'last seen recently'}
            </span>
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-gray-500">
            <p>Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6 text-center">
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={currentUser ? msg.sender_id === currentUser.id : false}
              showAvatar={false}
            />
          ))
        )}
      </div>

      {/* Attachment panel */}
      {showAttach && (
        <div className="px-4 py-3 bg-[#161b22] border-t border-[#21262d] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Send a photo</span>
            <button
              onClick={() => setShowAttach(false)}
              className="p-1 rounded-full hover:bg-[#21262d] transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MOCK_IMAGES.map((url, i) => (
              <button
                key={i}
                onClick={() => handleSendImage(url)}
                className="aspect-square rounded-lg overflow-hidden border border-[#21262d] hover:border-blue-500 transition-colors"
              >
                <img src={url} alt="Send" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-3 bg-[#161b22] border-t border-[#21262d] shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <button
              onClick={cancelRecording}
              className="p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-gray-300 font-mono text-sm">
                {Math.floor(recordDuration / 60)}:{String(recordDuration % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={sendVoiceMessage}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowAttach((s) => !s)}
              className={`p-3 rounded-full transition-colors shrink-0 ${
                showAttach ? 'bg-blue-500 text-white' : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d]'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message…"
              className="flex-1 bg-[#0d1117] text-white placeholder-gray-500 rounded-2xl px-4 py-3 text-[15px] outline-none border border-[#21262d] focus:border-blue-500 transition-colors"
            />
            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-3 rounded-full bg-[#21262d] text-gray-300 hover:bg-[#30363d] transition-colors shrink-0"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
