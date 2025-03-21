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
        <span>
          <span style={{ color: users[0].color }}>{users[0].username}</span>
          <span> is typing</span>
        </span>
      );
    } else if (users.length === 2) {
      return (
        <span>
          <span style={{ color: users[0].color }}>{users[0].username}</span>
          <span> and </span>
          <span style={{ color: users[1].color }}>{users[1].username}</span>
          <span> are typing</span>
        </span>
      );
    } else {
      return (
        <span>
          <span>Several people are typing</span>
        </span>
      );
    }
  };
  
  return (
    <div className="flex items-center gap-2 p-2 font-mono text-sm text-neon-green/70 bg-black/40 rounded-md border border-neon-green/20">
      {formatUsers()}
      <motion.div className="flex gap-1">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-neon-green"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-neon-green"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-neon-green"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </motion.div>
    </div>
  );
};

export default TypingIndicator; 
