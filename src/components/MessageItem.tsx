import React from 'react';
import { ChatMessage } from '@/context/ChatContext';

interface MessageItemProps {
  message: ChatMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  return (
    <div className="mb-4 animate-fade-in">
      <div className="flex items-start gap-2">
        <span className="font-mono text-sm" style={{ color: message.userColor }}>
          {message.username}:
        </span>
        <div className="flex-1">
          <span className="text-neon-green/90">{message.content}</span>
          <span className="text-xs text-neon-green/50 ml-2">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageItem; 