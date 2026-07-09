import { api } from '../services/api.js';

function Avatar({ src, name, size = 'md', className = '' }) {
  const avatarUrl = api.getAvatarUrl(src);
  const initials = api.getInitials(name);
  const color = api.getInitialsColor(name);

  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
