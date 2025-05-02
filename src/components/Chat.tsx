import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import UsernameBadge from './UsernameBadge';

const Chat: React.FC = () => {
  const { messages, leaderboard } = useChat();
  
  // Get the champion username
  const championUsername = leaderboard[0]?.username;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className="mb-4">
          <div className="flex items-start gap-2">
            <UsernameBadge 
              username={message.username} 
              color={message.userColor}
              isSystem={message.isSystem}
              isChampion={message.username === championUsername}
            />
            <div className="flex-1">
              {/* ... rest of your message rendering ... */}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Chat; 