import React from 'react';
import { Message } from '../types/Message';

interface MessageProps {
  message: Message;
}

const MessageComponent: React.FC<MessageProps> = ({ message }) => {
  return (
    <div className="message py-2 px-4">
      {message.replyTo && (
        <div className="reply-to text-neon-green/50 text-sm mb-1 pl-2 border-l-2 border-neon-green/30">
          {message.replyTo.content}
        </div>
      )}
      <div className="message-content text-neon-green">
        {message.content}
      </div>
      <div className="message-timestamp text-neon-green/30 text-xs mt-1">
        {message.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MessageComponent; 
