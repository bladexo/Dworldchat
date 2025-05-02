import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, useChat } from '@/context/ChatContext';
import { formatDistanceToNow } from 'date-fns';
import { Reply, ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react';
import { Button } from './ui/button';
import UsernameBadge from './UsernameBadge';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  onReplyClick: (message: ChatMessage) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onReplyClick }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser, sendMessageReaction, leaderboard } = useChat();
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Add logging for messages updates
  useEffect(() => {
    console.log('Messages updated:', messages.map(m => ({
      id: m.id,
      username: m.username,
      content: m.content,
      timestamp: m.timestamp,
      isSystem: m.isSystem || m.username?.toLowerCase() === 'system'
    })));
  }, [messages]);

  // Build thread structure
  const buildThreads = () => {
    const threads = new Map<string, ChatMessage[]>();
    const mainMessages: ChatMessage[] = [];

    messages.forEach(message => {
      // Check if message is system message
      const isSystem = message.isSystem || message.username?.toLowerCase() === 'system';
      
      // Add to appropriate collection
      if (!message.replyTo) {
        mainMessages.push(message);
      } else {
        const parentId = message.replyTo.id;
        if (!threads.has(parentId)) {
          threads.set(parentId, []);
        }
        threads.get(parentId)?.push(message);
      }
    });

    return { mainMessages, threads };
  };

  const toggleThreadExpansion = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const renderMessage = (message: ChatMessage, depth: number = 0, isLastInThread: boolean = true) => {
    // Check if message is system message
    const isSystem = message.isSystem || message.username?.toLowerCase() === 'system';
    const messageId = message.id;
    if (!messageId) return null;

    const replies = buildThreads().threads.get(messageId) || [];
    const hasMoreThanThreeReplies = replies.length > 3;
    const isExpanded = expandedThreads.has(messageId);
    const displayedReplies = hasMoreThanThreeReplies && !isExpanded ? replies.slice(0, 3) : replies;

    // Get champion username from leaderboard
    const championUsername = leaderboard[0]?.username;

    // Function to format message content with blue mentions
    const formatMessageContent = (content: string) => {
      const mentionRegex = /@(\w+)/g;
      const parts = content.split(mentionRegex);
      
      return parts.map((part, index) => {
        if (index % 2 === 1) { // This is a mention
          return <span key={index} className="text-blue-500 font-semibold">@{part}</span>;
        }
        return part;
      });
    };

    // Function to handle like button click
    const handleLike = () => {
      if (currentUser && messageId) {
        sendMessageReaction(messageId, 'thumbsup', message.roomId);
      }
    };

    // Get the count of likes for this message
    const getLikeCount = () => {
      if (!message.reactions || !message.reactions['thumbsup']) return 0;
      return message.reactions['thumbsup'].length;
    };

    const likeCount = getLikeCount();
    const hasLiked = currentUser && message.reactions?.thumbsup?.includes(currentUser.username);
        
    return (
      <div key={messageId}>
          <div 
          className={cn(
            'message-item flex flex-col animate-fade-in opacity-0',
              message.mentions?.includes(currentUser?.id || '') 
                ? 'bg-neon-green/5 border border-neon-green/20' 
              : '',
            isSystem ? 'relative p-3 my-2 ml-1' : '',
            depth > 0 ? 'relative' : ''
          )}
          style={{
            marginLeft: depth > 0 ? `${depth * 12}px` : isSystem ? '10px' : '0',
            ...(isSystem && {
              background: 'rgba(0, 17, 0, 0.7)',
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden'
            })
          }}
        >
          {isSystem && (
            <>
              {/* Animated borders container */}
              <div className="absolute inset-0">
                {/* Top border with breaks and animation */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-neon-green/30 animate-glow-pulse" 
                  style={{ 
                    boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
                    background: 'linear-gradient(90deg, transparent 0%, #39ff14 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'borderFlow 3s linear infinite'
                  }}>
                  <div className="absolute top-0 left-[20%] w-[10%] h-full bg-[#001100]" />
                  <div className="absolute top-0 right-[20%] w-[10%] h-full bg-[#001100]" />
                </div>
                {/* Bottom border with breaks and animation */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-neon-green/30 animate-glow-pulse"
                  style={{ 
                    boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
                    background: 'linear-gradient(90deg, transparent 0%, #39ff14 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'borderFlow 3s linear infinite'
                  }}>
                  <div className="absolute top-0 left-[20%] w-[10%] h-full bg-[#001100]" />
                  <div className="absolute top-0 right-[20%] w-[10%] h-full bg-[#001100]" />
                </div>
                {/* Left border with breaks and animation */}
                <div className="absolute left-0 top-0 w-[1px] h-full bg-neon-green/30 animate-glow-pulse"
                  style={{ 
                    boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
                    background: 'linear-gradient(180deg, transparent 0%, #39ff14 50%, transparent 100%)',
                    backgroundSize: '100% 200%',
                    animation: 'borderFlowVertical 3s linear infinite'
                  }}>
                  <div className="absolute top-[20%] left-0 w-full h-[10%] bg-[#001100]" />
                  <div className="absolute bottom-[20%] left-0 w-full h-[10%] bg-[#001100]" />
                </div>
                {/* Right border with breaks and animation */}
                <div className="absolute right-0 top-0 w-[1px] h-full bg-neon-green/30 animate-glow-pulse"
                  style={{ 
                    boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
                    background: 'linear-gradient(180deg, transparent 0%, #39ff14 50%, transparent 100%)',
                    backgroundSize: '100% 200%',
                    animation: 'borderFlowVertical 3s linear infinite'
                  }}>
                  <div className="absolute top-[20%] right-0 w-full h-[10%] bg-[#001100]" />
                  <div className="absolute bottom-[20%] right-0 w-full h-[10%] bg-[#001100]" />
                </div>
              </div>
              {/* System icon with pulse animation */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center animate-pulse">
                <div className="text-neon-green/70" style={{ textShadow: '0 0 10px rgba(57, 255, 20, 0.5)' }}>⚡</div>
              </div>
            </>
          )}

          <div className={cn("flex items-center gap-2", isSystem && "pl-8")}>
            <span className="text-neon-green/50 font-mono text-xs">{depth > 0 ? '└' : ''}</span>
              {!isSystem && (
              <UsernameBadge 
                username={message.username} 
                color={message.userColor || '#39ff14'}
                isSystem={isSystem}
                isChampion={message.username === championUsername}
              />
              )}
              {!isSystem && (
              <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(typeof message.timestamp === 'number' ? message.timestamp : new Date(message.timestamp).getTime(), { addSuffix: true })}
              </span>
              )}
            {!isSystem && (
              <div className="flex items-center gap-1">
                {/* Like button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    hasLiked 
                      ? "text-blue-400 hover:text-blue-500" 
                      : "text-muted-foreground hover:text-blue-400"
                  )}
                  onClick={handleLike}
                >
                  <div className="flex items-center">
                    <ThumbsUp className="h-4 w-4" />
                    {likeCount > 0 && <span className="text-xs ml-1">{likeCount}</span>}
                  </div>
                </Button>
                
                {/* Reply button */}
                {onReplyClick && (
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
            )}
          </div>
            
          <div className={cn("pl-4", isSystem && "pl-8")}>
            <p className={cn(
              "font-mono break-words text-sm md:text-base",
              isSystem ? "text-neon-green font-medium tracking-wide" : "text-foreground"
            )}
            style={{
              textShadow: isSystem ? '0 0 10px rgba(57, 255, 20, 0.3)' : 'none'
            }}>
              {formatMessageContent(message.content)}
            </p>
          </div>
        </div>

        {!isSystem && displayedReplies.map((reply, index) => (
          renderMessage(reply, depth + 1, index === displayedReplies.length - 1)
        ))}

        {/* Thread control buttons - show for any non-system message with >3 replies */}
        {!isSystem && hasMoreThanThreeReplies && (
          <div className="flex items-center gap-2 mt-2" style={{ marginLeft: depth > 0 ? `${depth * 12 + 12}px` : '12px' }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-neon-green/70 hover:text-neon-green flex items-center gap-1 px-2 py-1 h-6"
              onClick={() => toggleThreadExpansion(messageId)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span className="text-xs">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span className="text-xs">Show {replies.length - 3} more</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No messages yet.</p>
          </div>
        );
  }

  const { mainMessages, threads } = buildThreads();

  return (
    <>
      <div className="space-y-2 py-2">
        {mainMessages.map(message => renderMessage(message))}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
};

// Helper function to get all replies in a thread
const getAllThreadReplies = (messageId: string, threads: Map<string, ChatMessage[]>): ChatMessage[] => {
  const replies = threads.get(messageId) || [];
  const allReplies: ChatMessage[] = [...replies];
  
  replies.forEach(reply => {
    const nestedReplies = getAllThreadReplies(reply.id, threads);
    allReplies.push(...nestedReplies);
  });
  
  return allReplies;
};

export default MessageList;

