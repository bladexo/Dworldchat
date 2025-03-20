
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/context/ChatContext';
import UsernameBadge from './UsernameBadge';
import { formatDistanceToNow } from 'date-fns';
import { useChat } from '@/context/ChatContext';
import { format } from 'date-fns';
import { Reply } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  onReplyClick: (message: ChatMessage) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onReplyClick }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useChat();

  // Auto-scroll to the most recent message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {messages.map((message, index) => {
        const isSystem = message.username.toLowerCase() === 'system';
        
        return (
          <div 
            key={message.id}
            className={`message-item flex flex-col animate-fade-in opacity-0 ${
              message.mentions?.includes(currentUser?.id || '') 
                ? 'bg-neon-green/5 border border-neon-green/20' 
                : ''
            }`}
            style={{ animationDelay: `${index % 10 * 50}ms` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <UsernameBadge 
                username={message.username} 
                color={message.userColor}
                isSystem={isSystem}
              />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
              {!isSystem && onReplyClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-neon-green"
                  onClick={() => onReplyClick(message)}
                >
                  <Reply className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Display reply info if this message is a reply */}
            {message.replyTo && (
              <div className="ml-3 pl-2 border-l-2 border-neon-green/30 dark:border-neon-green/20 mb-1 mt-1">
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">Replying to </span>
                  <UsernameBadge 
                    username={message.replyTo.username} 
                    className="ml-1 scale-90"
                    color={message.userColor}
                  />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {message.replyTo.content}
                </p>
              </div>
            )}
            
            <div className="pl-2">
              <p className={cn(
                "font-mono break-words text-sm md:text-base",
                isSystem ? "text-neon-green" : "text-foreground"
              )}>
                {message.content}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

