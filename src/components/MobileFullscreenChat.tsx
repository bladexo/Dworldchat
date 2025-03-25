import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/context/ChatContext';
import MessageList from './MessageList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import UsernameBadge from './UsernameBadge';
import TypingIndicator from './TypingIndicator';

interface MobileFullscreenChatProps {
  messages: ChatMessage[];
  messageInput: string;
  replyingTo: ChatMessage | null;
  typingUsers: any[];
  onSendMessage: (e: React.FormEvent) => Promise<void>;
  onMessageInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplyClick: (message: ChatMessage) => void;
  onCancelReply: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const MobileFullscreenChat: React.FC<MobileFullscreenChatProps> = ({
  messages,
  messageInput,
  replyingTo,
  typingUsers,
  onSendMessage,
  onMessageInput,
  onReplyClick,
  onCancelReply,
  inputRef,
}) => {
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Lock body scroll
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    // Initial layout setup
    handleLayout();

    // Set up viewport change listener
    window.visualViewport?.addEventListener('resize', handleLayout);
    window.visualViewport?.addEventListener('scroll', handleLayout);

    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      
      window.visualViewport?.removeEventListener('resize', handleLayout);
      window.visualViewport?.removeEventListener('scroll', handleLayout);
    };
  }, []);

  const handleLayout = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const keyboardHeight = window.innerHeight - viewport.height;
    const headerHeight = 48;
    const inputHeight = 56;
    const availableHeight = viewport.height - headerHeight - inputHeight;

    if (chatWindowRef.current) {
      Object.assign(chatWindowRef.current.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        height: '100%',
        overflow: 'hidden'
      });
    }

    if (messageContainerRef.current) {
      Object.assign(messageContainerRef.current.style, {
        height: `${availableHeight}px`,
        maxHeight: `${availableHeight}px`,
        overflowY: 'auto',
        position: 'relative',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
      });
    }

    if (formRef.current) {
      Object.assign(formRef.current.style, {
        position: 'fixed',
        bottom: `${keyboardHeight}px`,
        left: '0',
        right: '0',
        backgroundColor: '#000F00',
        transition: 'none',
        padding: '8px',
        borderTop: '1px solid rgba(57, 255, 20, 0.3)'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSendMessage(e as unknown as React.FormEvent);
    }
  };

  return (
    <div ref={chatWindowRef} className="mobile-fullscreen-chat bg-[#001100]">
      <div 
        ref={messageContainerRef}
        className="message-container"
      >
        <MessageList 
          messages={messages} 
          onReplyClick={onReplyClick}
        />
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
      </div>

      <form 
        ref={formRef}
        onSubmit={onSendMessage} 
        className="input-form"
      >
        {replyingTo && (
          <div className="flex items-center gap-2 p-2 rounded bg-black/40 border border-neon-green/30 mb-2">
            <span className="text-xs text-muted-foreground">Replying to</span>
            <UsernameBadge 
              username={replyingTo.username} 
              color={replyingTo.userColor}
              className="scale-90"
            />
            <span className="text-sm truncate">{replyingTo.content}</span>
            <Button
              type="button"
              className="h-6 w-6 ml-auto text-muted-foreground hover:text-neon-green"
              onClick={onCancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={messageInput}
            onChange={onMessageInput}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="font-mono text-sm bg-black/40 text-white border-white/20 rounded-md focus:border-white/50 focus:ring-white/10 placeholder-white/30 min-w-0"
          />
          <Button 
            type="submit" 
            className="bg-transparent border border-white/20 text-white hover:bg-white/5 transition-all rounded-md px-3 flex-shrink-0"
            disabled={!messageInput.trim()}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MobileFullscreenChat; 
