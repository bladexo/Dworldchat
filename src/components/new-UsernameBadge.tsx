import React from 'react';
import { cn } from '../lib/utils';
import { User, Crown, Sparkles } from 'lucide-react';

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
  color = '#a855f7',
  className,
  showIcon = false,
  isSystem = false,
  isChampion = false,
}) => {
  const displayName = username || 'Anonymous';
  const isSystemUser = isSystem || displayName.toLowerCase() === 'system';

  if (isSystemUser) {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        "bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30",
        "text-primary animate-pulse-subtle",
        className
      )}>
        <Sparkles className="w-3.5 h-3.5" />
        <span>SYSTEM</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'username-badge relative group cursor-pointer',
        isChampion && 'ring-2 ring-primary/50',
        className
      )}
      style={{
        borderColor: `${color}40`,
      }}
      onClick={() => {
        navigator.clipboard.writeText(displayName);
      }}
    >
      {isChampion && (
        <Crown className="w-3.5 h-3.5 text-primary absolute -top-2 -right-2 animate-float" />
      )}
      
      {showIcon && (
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          <User className="w-3.5 h-3.5" />
        </div>
      )}
      
      <span 
        className="font-medium"
        style={{ color: color }}
      >
        {displayName}
      </span>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Click to copy
      </div>
    </div>
  );
};

export default UsernameBadge;
