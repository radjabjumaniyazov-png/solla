import type { Message, User } from '@/types';
import { formatTime } from '@/lib/db';
import { Check, CheckCheck, Play } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  sender?: User | null;
}

export function MessageBubble({ message, isOwn, showAvatar, sender }: MessageBubbleProps) {
  const bubbleClass = isOwn
    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
    : 'bg-[#1c2128] text-gray-100 rounded-2xl rounded-bl-md';

  return (
    <div className={`flex items-end gap-2 px-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && showAvatar && sender && (
        <div className="shrink-0 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-white text-xs overflow-hidden"
            style={{ backgroundColor: sender.avatar_color }}
          >
            {sender.avatar_url ? (
              <img src={sender.avatar_url} alt={sender.username} className="w-full h-full object-cover" />
            ) : (
              sender.username.slice(0, 2).toUpperCase()
            )}
          </div>
        </div>
      )}
      <div className={`max-w-[75%] ${bubbleClass} px-3.5 py-2 shadow-sm`}>
        {message.message_type === 'image' && message.image_url && (
          <div className="mb-1">
            <img
              src={message.image_url}
              alt="Shared"
              className="rounded-lg max-w-full max-h-64 object-cover"
            />
          </div>
        )}
        {message.message_type === 'voice' && (
          <div className="flex items-center gap-2 py-1 min-w-[140px]">
            <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-white" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-0.5 h-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full bg-white/40"
                    style={{ height: `${30 + Math.sin(i * 0.8) * 40 + Math.random() * 30}%` }}
                  />
                ))}
              </div>
              <span className="text-xs text-white/70 mt-0.5 block">
                {message.voice_duration}s
              </span>
            </div>
          </div>
        )}
        {message.message_type === 'text' && message.content && (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5 justify-end">
          <span className={`text-[11px] ${isOwn ? 'text-blue-100/70' : 'text-gray-500'}`}>
            {formatTime(message.created_at)}
          </span>
          {isOwn && (
            message.read_at ? (
              <CheckCheck className="w-3.5 h-3.5 text-blue-100/70" />
            ) : (
              <Check className="w-3.5 h-3.5 text-blue-100/50" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
