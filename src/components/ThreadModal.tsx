import React from 'react';
import { ChatMessage } from '@/context/ChatContext';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import UsernameBadge from './UsernameBadge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useChat } from '@/context/ChatContext';

interface ThreadModalProps {
  message: ChatMessage;
  replies: ChatMessage[];
  onClose: () => void;
}

const ThreadModal: React.FC<ThreadModalProps> = ({ message, replies, onClose }) => {
  const { leaderboard } = useChat();
  const championUsername = leaderboard[0]?.username;

  const renderThreadMessage = (msg: ChatMessage, depth: number = 0) => {
    const isSystem = msg.username.toLowerCase() === 'system';
    
    return (
      <div 
        key={msg.id}
        className="flex flex-col"
        style={{
          marginLeft: depth > 0 ? `${depth * 20}px` : '0'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-neon-green/50 font-mono">{depth > 0 ? '└──' : ''}</span>
          <UsernameBadge 
            username={msg.username} 
            color={msg.userColor}
            isSystem={isSystem}
            isChampion={msg.username === championUsername}
          />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
          </span>
        </div>
        
        <div className="pl-8">
          <p className={cn(
            "font-mono break-words text-sm md:text-base",
            isSystem ? "text-neon-green" : "text-foreground"
          )}>
            {msg.content}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-[#001100] border border-neon-green/30 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="terminal-header bg-black/40 px-4 py-2 flex justify-between items-center border-b border-neon-green/30">
          <span className="font-mono text-sm text-neon-green">Thread</span>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-neon-green hover:bg-neon-green/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)] space-y-4">
          {renderThreadMessage(message)}
          {replies.map(reply => 
            renderThreadMessage(reply, getReplyDepth(reply, message.id))
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate reply depth
const getReplyDepth = (message: ChatMessage, originalMessageId: string): number => {
  let depth = 1;
  let currentMessage = message;
  
  while (currentMessage.replyTo && currentMessage.replyTo.id !== originalMessageId) {
    depth++;
    // Find the parent message in the thread
    currentMessage = {
      ...currentMessage,
      replyTo: currentMessage.replyTo
    };
  }
  
  return depth;
};

export default ThreadModal; 