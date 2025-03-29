import React from 'react';

interface OnlineCounterProps {
  count: number;
}

const OnlineCounter: React.FC<OnlineCounterProps> = ({ count }) => {
  return (
    <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground">
      <div className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse"></div>
      <span>{count}<span className="hidden sm:inline"> online</span></span>
    </div>
  );
};

export default OnlineCounter;
