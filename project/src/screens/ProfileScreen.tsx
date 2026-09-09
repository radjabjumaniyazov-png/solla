import { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { ArrowLeft, Camera, Check, X } from 'lucide-react';

interface ProfileScreenProps {
  onBack: () => void;
}

const PRESET_AVATARS = [
  'https://images.pexels.com/photos/5308640/pexels-photo-5308640.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/35490803/pexels-photo-35490803.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/2341350/pexels-photo-2341350.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/33680674/pexels-photo-33680674.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/10230832/pexels-photo-10230832.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/35725749/pexels-photo-35725749.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/36271952/pexels-photo-36271952.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/13548627/pexels-photo-13548627.jpeg?auto=compress&cs=tinysrgb&w=200',
];

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { currentUser, updateAvatar } = useApp();
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const displayUrl = selectedUrl ?? currentUser.avatar_url;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      setError('Image must be under 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedUrl(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedUrl) {
      onBack();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateAvatar(selectedUrl);
      onBack();
    } catch {
      setError('Failed to save photo. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      <header className="flex items-center gap-3 px-3 py-2.5 bg-[#161b22] border-b border-[#21262d] shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-[#21262d] transition-colors text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Current avatar preview */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar
              name={currentUser.username}
              color={currentUser.avatar_color}
              size={120}
              avatarUrl={displayUrl}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-blue-500 border-3 border-[#0d1117] flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
              style={{ borderWidth: 3 }}
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <h3 className="text-xl font-bold text-white mt-4">{currentUser.username}</h3>
          <p className="text-sm text-gray-500 mt-1">Tap the camera to upload a photo</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Preset avatars */}
        <div className="mb-2">
          <p className="text-sm font-semibold text-gray-400 mb-3">Or choose a preset</p>
          <div className="grid grid-cols-4 gap-3">
            {PRESET_AVATARS.map((url) => (
              <button
                key={url}
                onClick={() => { setSelectedUrl(url); setError(''); }}
                className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all ${
                  displayUrl === url
                    ? 'border-blue-500 scale-95'
                    : 'border-transparent hover:border-[#30363d]'
                }`}
              >
                <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                {displayUrl === url && (
                  <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Remove photo */}
        {currentUser.avatar_url && (
          <button
            onClick={() => { setSelectedUrl(''); }}
            className="w-full mt-8 py-3 rounded-xl bg-[#1c2128] text-gray-300 text-sm font-medium hover:bg-[#21262d] transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Remove current photo
          </button>
        )}
      </div>
    </div>
  );
}
