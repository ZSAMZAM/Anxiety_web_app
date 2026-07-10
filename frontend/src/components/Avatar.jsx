import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

function getRoleEmoji(role) {
  if (!role) return '👤';
  switch (role.toString().toLowerCase()) {
    case 'doctor':
      return '🩺';
    case 'admin':
    case 'super_admin':
      return '🛡️';
    case 'therapist':
    case 'counselor':
      return '🧠';
    case 'support':
      return '💬';
    case 'user':
      return '👤';
    default:
      return '👤';
  }
}

function Avatar({ src, name, role, size = 'md', className = '' }) {
  const [hasError, setHasError] = useState(false);
  const avatarUrl = api.getAvatarUrl(src);
  const initials = api.getInitials(name);
  const color = api.getInitialsColor(name);
  const displayText = name?.trim() ? initials : getRoleEmoji(role);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold tracking-tight text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      {displayText}
    </div>
  );
}

export default Avatar;
