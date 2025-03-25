import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  users: Array<{
    username: string;
    color: string;
  }>;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  const formatUsers = () => {
    if (users.length === 1) {
      return (
        <span className="text-xs opacity-70">
          <span style={{ color: users[0].color }}>{users[0].username}</span>
          <span className="text-white/50"> is typing</span>
        </span>
      );
    } else if (users.length === 2) {
      return (
        <span className="text-xs opacity-70">
          <span style={{ color: users[0].color }}>{users[0].username}</span>
          <span className="text-white/50"> and </span>
          <span style={{ color: users[1].color }}>{users[1].username}</span>
          <span className="text-white/50"> are typing</span>
        </span>
      );
    } else {
      return (
        <span className="text-xs text-white/50 opacity-70">
          Several people are typing
        </span>
      );
    }
  };
  
  return (
    <div className="flex items-center gap-1 px-2 py-1 font-mono text-xs">
      {formatUsers()}
      <motion.div className="flex gap-0.5 ml-0.5">
        <motion.span
          className="w-1 h-1 rounded-full bg-white/50"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1 h-1 rounded-full bg-white/50"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-1 h-1 rounded-full bg-white/50"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </motion.div>
    </div>
  );
};

export default TypingIndicator; 
