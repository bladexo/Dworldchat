import React from 'react';
import { cn } from '@/lib/utils';
import { User } from '@/context/ChatContext';

interface UsernameBadgeProps {
  username: string;
  color?: string;
  className?: string;
  showIcon?: boolean;
  isSystem?: boolean;
}

const UsernameBadge: React.FC<UsernameBadgeProps> = ({
  username = 'Anonymous',
  color = '#39ff14',
  className,
  showIcon = false,
  isSystem = false,
}) => {
  const displayName = username || 'Anonymous';
  const isSystemUser = isSystem || displayName.toLowerCase() === 'system';

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs md:text-sm px-2 py-0.5 rounded font-mono font-medium',
        isSystemUser ? 'text-neon-green animate-pulse-subtle' : 'bg-opacity-20 border border-opacity-30',
        className
      )}
      style={{
        backgroundColor: isSystemUser ? 'rgba(57, 255, 20, 0.1)' : `${color}20`,
        borderColor: isSystemUser ? 'transparent' : `${color}30`,
        color: isSystemUser ? '#39ff14' : color,
        textShadow: isSystemUser ? '0 0 10px rgba(57, 255, 20, 0.5)' : 'none',
      }}
    >
      {showIcon && (
        <span className="mr-1 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
            style={{ backgroundColor: color }}></span>
          <span className="relative inline-flex rounded-full h-2 w-2" 
            style={{ backgroundColor: color }}></span>
        </span>
      )}
      {isSystemUser ? '⟦SYSTEM⟧' : displayName}
    </span>
  );
};

export default UsernameBadge;
