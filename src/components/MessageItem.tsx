import React, { useState } from 'react';
import { ChatMessage } from '@/context/ChatContext';
import { Button } from './ui/button';
import { MessageSquare, Reply } from 'lucide-react';
import ThreadModal from './ThreadModal';
import UsernameBadge from './UsernameBadge';

interface MessageItemProps {
  message: ChatMessage;
  replies: ChatMessage[];
  onReplyClick: (message: ChatMessage) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, replies, onReplyClick }) => {
  const [showThread, setShowThread] = useState(false);
  
  // Only show first 2 replies in the main chat
  const visibleReplies = replies.slice(0, 2);
  const hasMoreReplies = replies.length > 2;
  const hiddenRepliesCount = replies.length - 2;

  return (
    <>
      <div className="mb-4 animate-fade-in">
        {/* Main message */}
        <div className="flex items-start gap-2">
          <span className="font-mono text-sm" style={{ color: message.userColor }}>
            {message.username}:
          </span>
          <div className="flex-1">
            <span className="text-neon-green/90">{message.content}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neon-green/50">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-neon-green/70 hover:text-neon-green flex items-center gap-1"
                onClick={() => onReplyClick(message)}
              >
                <Reply className="h-3 w-3" />
                Reply
              </Button>
            </div>
          </div>
        </div>

        {/* Show first 2 replies */}
        {visibleReplies.length > 0 && (
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-neon-green/20 pl-4">
            {visibleReplies.map(reply => (
              <div key={reply.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <UsernameBadge 
                    username={reply.username} 
                    color={reply.userColor}
                  />
                  <span className="text-neon-green/90">{reply.content}</span>
                </div>
              </div>
            ))}
            
            {/* Show "View Thread" button if there are more replies */}
            {hasMoreReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-neon-green/70 hover:text-neon-green hover:bg-neon-green/10 flex items-center gap-2"
                onClick={() => setShowThread(true)}
              >
                <MessageSquare className="h-4 w-4" />
                View {hiddenRepliesCount} more {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Thread Modal */}
      {showThread && (
        <ThreadModal
          message={message}
          replies={replies}
          onClose={() => setShowThread(false)}
        />
      )}
    </>
  );
};

export default MessageItem; 