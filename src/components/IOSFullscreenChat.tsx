import React, { useEffect, useRef } from 'react';
import { Message } from '../types/Message';
import MessageComponent from './Message';
import { Minimize, Send } from 'lucide-react';

interface IOSFullscreenChatProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onExitFullscreen: () => void;
  isTyping?: boolean;
}

const IOSFullscreenChat: React.FC<IOSFullscreenChatProps> = ({
  messages,
  onSendMessage,
  onExitFullscreen,
  isTyping
}) => {
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle viewport changes for keyboard
  useEffect(() => {
    const adjustChatHeight = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const keyboardHeight = window.innerHeight - viewport.height;

      // Adjust message container height
      if (messageContainerRef.current) {
        const headerHeight = 48; // Header height
        const inputHeight = 56; // Input form height
        const availableHeight = viewport.height - headerHeight - inputHeight;
        messageContainerRef.current.style.height = `${availableHeight}px`;
      }

      // Move form up with keyboard
      if (formRef.current) {
        formRef.current.style.bottom = `${keyboardHeight}px`;
      }
    };

    window.visualViewport?.addEventListener('resize', adjustChatHeight);
    window.visualViewport?.addEventListener('scroll', adjustChatHeight);
    adjustChatHeight(); // Initial adjustment

    return () => {
      window.visualViewport?.removeEventListener('resize', adjustChatHeight);
      window.visualViewport?.removeEventListener('scroll', adjustChatHeight);
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value.trim()) return;
    
    onSendMessage(inputRef.current.value);
    inputRef.current.value = '';
  };

  return (
    <div 
      ref={chatWindowRef}
      className="fixed inset-0 bg-black flex flex-col"
      style={{ 
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="terminal-header bg-black/40 px-2 sm:px-4 py-1 sm:py-2 flex justify-between items-center border-b border-neon-green/30">
        <h1 className="text-neon-green text-lg sm:text-xl font-mono">Terminal Chat</h1>
        <button
          onClick={onExitFullscreen}
          className="text-neon-green hover:text-neon-green/70 transition-colors"
          aria-label="Exit fullscreen"
        >
          <Minimize size={24} />
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-neon-green/50 hover:scrollbar-thumb-neon-green/70 pr-1 sm:pr-2"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch' as any
        }}
      >
        {messages.map((message, index) => (
          <MessageComponent key={index} message={message} />
        ))}
        {isTyping && (
          <div className="text-neon-green/50 italic pl-4 py-2">Bot is typing...</div>
        )}
      </div>

      {/* Input Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-black border-t border-neon-green/30 p-2"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 bg-black/50 text-neon-green placeholder-neon-green/30 border border-neon-green/30 rounded p-2 focus:outline-none focus:border-neon-green resize-none"
            placeholder="Type a message..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="text-neon-green hover:text-neon-green/70 transition-colors p-2"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default IOSFullscreenChat; 
