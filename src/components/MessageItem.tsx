import React, { useState } from 'react';
import { ChatMessage } from '@/context/ChatContext';
import { Button } from './ui/button';
import { MessageSquare, Reply, ThumbsUp } from 'lucide-react';
import ThreadModal from './ThreadModal';
import UsernameBadge from './UsernameBadge';
import { Link } from '@reach/router';
import Linkify from 'react-linkify';
import { format } from 'date-fns';
import { FaReply } from 'react-icons/fa';
import { useChat } from '../context/ChatContext';

interface MessageItemProps {
  message: ChatMessage;
  replies: ChatMessage[];
  onReplyClick: (message: ChatMessage) => void;
  showReply?: boolean;
  isPreview?: boolean;
  setSelectedReplyToMessage?: (message: ChatMessage | null) => void;
  openThreadModal?: (message: ChatMessage) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  replies, 
  onReplyClick,
  showReply = true, 
  isPreview = false,
  setSelectedReplyToMessage,
  openThreadModal
}) => {
  const { currentUser, sendMessageReaction, currentRoom } = useChat();
  const [showThread, setShowThread] = useState(false);
  
  // Only show first 2 replies in the main chat
  const visibleReplies = replies.slice(0, 2);
  const hasMoreReplies = replies.length > 2;
  const hiddenRepliesCount = replies.length - 2;

  const formatDate = (date: Date) => {
    return format(new Date(date), 'h:mm a');
  };

  const handleReply = () => {
    if (setSelectedReplyToMessage) {
      setSelectedReplyToMessage(message);
    }
  };

  const handleThreadOpen = () => {
    if (openThreadModal) {
      openThreadModal(message);
    }
  };

  const handleLike = () => {
    if (currentUser && message.id) {
      sendMessageReaction(message.id, 'thumbsup', message.roomId);
    }
  };

  // Get count of likes from reactions
  const getLikeCount = () => {
    if (!message.reactions || !message.reactions['thumbsup']) return 0;
    return message.reactions['thumbsup'].length;
  };

  const likeCount = getLikeCount();
  const hasLiked = currentUser && message.reactions?.thumbsup?.includes(currentUser.username);

  const messageContent = (
    <Linkify properties={{ target: '_blank', rel: 'noopener noreferrer' }}>
      {message.content}
    </Linkify>
  );

  return (
    <>
      <div className={`mb-4 animate-fade-in ${isPreview ? 'opacity-70' : ''} relative px-1 py-1 -mx-1 rounded-md hover:bg-black/10`}>
        {/* Main message */}
        <div className="flex items-start gap-2">
          <span className="font-mono text-sm" style={{ color: message.userColor }}>
            {message.username}:
          </span>
          <div className="flex-1">
            <div className="flex items-baseline relative">
              <Link
                to={`/u/${message.username}`}
                className={`mr-2 font-bold hover:underline`}
                style={{ color: message.userColor }}
              >
                {message.username}
              </Link>
              <span className="text-xs text-gray-500">{formatDate(message.timestamp)}</span>
              
              {showReply && !isPreview && (
                <div className="ml-auto flex items-center gap-2">
                  <button 
                    onClick={handleLike} 
                    className={`px-2 py-1 rounded flex items-center gap-1 ${
                      hasLiked 
                        ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' 
                        : 'bg-black/50 text-gray-300 hover:text-blue-400 border border-gray-700 hover:border-blue-500/30'
                    } transition-all`}
                    aria-label="Like message"
                  >
                    <ThumbsUp size={16} />
                    <span className="text-xs font-mono">{likeCount || ''}</span>
                  </button>
                  <button 
                    onClick={handleReply} 
                    className="px-2 py-1 rounded bg-black/50 text-gray-300 hover:text-neon-green border border-gray-700 hover:border-neon-green/30 transition-all"
                    aria-label="Reply to message"
              >
                    <FaReply size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-1">{messageContent}</div>
            {likeCount > 0 && !showReply && (
              <div className="flex items-center gap-1 mt-1 text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded inline-flex border border-blue-500/30">
                <ThumbsUp size={12} />
                <span className="font-mono">{likeCount}</span>
              </div>
            )}
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