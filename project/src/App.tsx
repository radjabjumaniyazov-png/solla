import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { ChatListScreen } from '@/screens/ChatListScreen';
import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import type { User } from '@/types';

type View =
  | { name: 'list' }
  | { name: 'chat'; chatId: string; otherUser: User }
  | { name: 'profile' };

function MessengerApp() {
  const { currentUser, loading } = useApp();
  const [view, setView] = useState<View>({ name: 'list' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
      {/* Phone shell */}
      <div className="relative w-full h-full max-w-md mx-auto bg-[#0d1117] overflow-hidden sm:my-4 sm:rounded-3xl sm:h-[calc(100vh-2rem)] sm:shadow-2xl sm:border sm:border-[#21262d]">
        {view.name === 'list' && (
          <ChatListScreen
            onOpenChat={(chatId, otherUser) => setView({ name: 'chat', chatId, otherUser })}
            onOpenProfile={() => setView({ name: 'profile' })}
          />
        )}
        {view.name === 'chat' && (
          <ChatRoomScreen
            chatId={view.chatId}
            otherUser={view.otherUser}
            onBack={() => setView({ name: 'list' })}
          />
        )}
        {view.name === 'profile' && (
          <ProfileScreen onBack={() => setView({ name: 'list' })} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <MessengerApp />
    </AppProvider>
  );
}

export default App;
