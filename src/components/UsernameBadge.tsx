import * as React from 'react';
import { cn } from '../lib/utils';

interface UsernameBadgeProps {
  username?: string;
  color?: string;
  className?: string;
  showIcon?: boolean;
  isSystem?: boolean;
  isChampion?: boolean;
}

const UsernameBadge: React.FC<UsernameBadgeProps> = ({
  username = 'Anonymous',
  color = '#39ff14',
  className,
  showIcon = false,
  isSystem = false,
  isChampion = false,
}) => {
  const displayName = username || 'Anonymous';
  const isSystemUser = isSystem || displayName.toLowerCase() === 'system';

  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded text-sm font-mono relative overflow-visible',
        isSystemUser ? 'text-neon-green animate-pulse-subtle' : 'bg-opacity-20 border border-opacity-30',
        isChampion && !isSystemUser && 'champion-badge',
        className
      )}
      style={{
        backgroundColor: isSystemUser ? 'transparent' : `${color}20`,
        borderColor: isSystemUser ? 'transparent' : `${color}30`,
        color: isSystemUser ? '#39ff14' : color,
        textShadow: isSystemUser ? '0 0 10px rgba(57, 255, 20, 0.5)' : 
                  isChampion ? `0 0 10px ${color}, 0 0 20px ${color}, 0 0 30px ${color}` : 'none',
      }}
    >
      {isChampion && !isSystemUser && (
        <>
          <div 
            className="absolute inset-0 border border-current rounded opacity-50 animate-border-flow"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${color}20 0%, transparent 70%)`
            }}
          />
          <div 
            className="absolute inset-0 rounded"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${color}10 0%, transparent 70%)`,
              animation: 'champion-pulse 2s ease-in-out infinite'
            }}
          />
        </>
      )}
      {isSystemUser ? null : displayName}
    </div>
  );
};

export default UsernameBadge;
