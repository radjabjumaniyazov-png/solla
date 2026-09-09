import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MessageCircle } from 'lucide-react';

export function AuthScreen() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(trimmed);
    } catch {
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
            <MessageCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mesh Messenger</h1>
          <p className="text-gray-400 mt-2 text-center">
            Enter a username to start chatting instantly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              disabled={loading}
              className="w-full bg-[#1c2128] text-white placeholder-gray-500 rounded-2xl px-5 py-4 text-lg outline-none border-2 border-transparent focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm px-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold py-4 rounded-2xl text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            {loading ? 'Signing in…' : 'Start Messaging'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-8">
          No password needed — just pick a name and chat.
          Open in two tabs to test real-time messaging.
        </p>
      </div>
    </div>
  );
}
