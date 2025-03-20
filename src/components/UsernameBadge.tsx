
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
  username,
  color = '#39ff14',
  className,
  showIcon = false,
  isSystem = false,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs md:text-sm px-2 py-0.5 rounded font-mono font-medium',
        isSystem ? 'bg-neon-green/10 text-neon-green' : 'bg-opacity-20 border border-opacity-30',
        className
      )}
      style={{
        backgroundColor: `${isSystem ? '' : color}20`,
        borderColor: `${isSystem ? '' : color}30`,
        color: color,
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
      {isSystem ? '[system]' : username}
    </span>
  );
};

export default UsernameBadge;
