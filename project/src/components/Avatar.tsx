interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
  avatarUrl?: string | null;
}

export function Avatar({ name, color, size = 48, online, avatarUrl }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-semibold text-white"
          style={{ backgroundColor: color, fontSize: size * 0.38 }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#0d1117] ${
            online ? 'bg-green-500' : 'bg-gray-500'
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
