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
    <div
      className={cn(
        'px-2 py-0.5 rounded text-sm font-mono',
        isSystemUser ? 'text-neon-green animate-pulse-subtle' : 'bg-opacity-20 border border-opacity-30',
      )}
      style={{
        backgroundColor: isSystemUser ? 'transparent' : `${color}20`,
        borderColor: isSystemUser ? 'transparent' : `${color}30`,
        color: isSystemUser ? '#39ff14' : color,
        textShadow: isSystemUser ? '0 0 10px rgba(57, 255, 20, 0.5)' : 'none',
      }}
    >
      {isSystemUser ? null : displayName}
    </div>
  );
};

export default UsernameBadge;
