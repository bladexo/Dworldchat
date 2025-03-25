import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '@/context/ChatContext';
import MessageList from './MessageList';
import UsernameBadge from './UsernameBadge';
import OnlineCounter from './OnlineCounter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, Send, UserPlus, Loader2, X, Wifi, WifiOff, Minimize, Maximize, Volume2, VolumeX } from 'lucide-react';
import NotificationFeed from './NotificationFeed';
import TypingIndicator from './TypingIndicator';
import { soundManager } from '@/utils/sound';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFullscreen } from '@/hooks/use-fullscreen';

const ChatInterface: React.FC = () => {
  const { messages, currentUser, onlineUsers, notifications, sendMessage, createUser, typingUsers, handleInputChange, isConnected } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const typingUsersList = Array.from(typingUsers)
    .filter(([id, _]) => id !== currentUser?.id)
    .map(([_, user]) => user);

  useEffect(() => {
    if (currentUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentUser]);

  // Initialize audio on first interaction
  useEffect(() => {
    const initAudio = () => {
      // Try to play a silent sound to initialize audio
      soundManager.playMessageSound();
      // Remove the event listener after first interaction
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  // Handle mentions and message sounds
  useEffect(() => {
    if (!soundEnabled) return;
    
    const lastNotification = notifications[0];
    if (lastNotification?.type === 'message') {
      if (lastNotification.mentions?.includes(currentUser?.id || '')) {
        soundManager.playMentionSound();
      } else if (lastNotification.username !== currentUser?.username) {
        soundManager.playMessageSound();
      }
    }
  }, [notifications, soundEnabled, currentUser]);

  // Add message container scroll handler
  useEffect(() => {
    if (messageContainerRef.current && messages.length > 0) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Enhanced viewport height management
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleVisualViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport || !isMobile || !isFullscreen) return;

      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const keyboardHeight = window.innerHeight - viewport.height;
        
        // Lock the body in place
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        if (chatWindowRef.current) {
          chatWindowRef.current.style.position = 'fixed';
          chatWindowRef.current.style.top = '0';
          chatWindowRef.current.style.left = '0';
          chatWindowRef.current.style.right = '0';
          chatWindowRef.current.style.bottom = '0';
          chatWindowRef.current.style.height = '100%';
          chatWindowRef.current.style.overflow = 'hidden';
        }

        if (messageContainerRef.current) {
          const headerHeight = 48;
          const inputHeight = 56;
          const availableHeight = viewport.height - headerHeight - inputHeight;
          
          messageContainerRef.current.style.height = `${availableHeight}px`;
          messageContainerRef.current.style.maxHeight = `${availableHeight}px`;
          messageContainerRef.current.style.overflowY = 'auto';
          messageContainerRef.current.style.position = 'relative';
          messageContainerRef.current.style.overscrollBehavior = 'contain';
        }

        if (formRef.current) {
          formRef.current.style.position = 'fixed';
          formRef.current.style.bottom = keyboardHeight > 0 ? `${keyboardHeight}px` : '0';
          formRef.current.style.left = '0';
          formRef.current.style.right = '0';
          formRef.current.style.backgroundColor = '#000F00';
          formRef.current.style.transition = 'none';
          formRef.current.style.zIndex = '50';
          formRef.current.style.paddingBottom = keyboardHeight > 0 ? '8px' : '4px';
        }
      }, 50);
    };

    if (isMobile && isFullscreen) {
      window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
      window.visualViewport?.addEventListener('scroll', handleVisualViewportChange);
      handleVisualViewportChange();
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
      };
    }
    
    return undefined;
  }, [isMobile, isFullscreen]);

  // Thorough cleanup when fullscreen changes
  useEffect(() => {
    if (!isFullscreen) {
      // Reset ALL styles
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      
      if (chatWindowRef.current) {
        chatWindowRef.current.style.position = '';
        chatWindowRef.current.style.top = '';
        chatWindowRef.current.style.left = '';
        chatWindowRef.current.style.right = '';
        chatWindowRef.current.style.bottom = '';
        chatWindowRef.current.style.height = '';
        chatWindowRef.current.style.overflow = '';
      }
      
      if (messageContainerRef.current) {
        messageContainerRef.current.style.height = '';
        messageContainerRef.current.style.maxHeight = '';
        messageContainerRef.current.style.overflowY = '';
        messageContainerRef.current.style.position = '';
        messageContainerRef.current.style.overscrollBehavior = '';
        messageContainerRef.current.style.paddingBottom = '60px'; // Add padding for form
      }

      if (formRef.current) {
        formRef.current.style.position = 'absolute';
        formRef.current.style.bottom = '0';
        formRef.current.style.left = '0';
        formRef.current.style.right = '0';
        formRef.current.style.backgroundColor = '#000F00';
        formRef.current.style.transition = 'none';
        formRef.current.style.zIndex = '10';
        formRef.current.style.paddingBottom = '4px';
      }
    }
  }, [isFullscreen]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (messageInput.trim()) {
      // Simple send without any focus or scroll manipulation
      await sendMessage(messageInput, replyingTo);
      if (soundEnabled) {
        soundManager.playMessageSound();
      }
      setMessageInput('');
      setReplyingTo(null);
    }
  };

  const handleReplyClick = (message: ChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleMessageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessageInput(newValue);
    handleInputChange(newValue);
  };

  const handleCreateUser = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await createUser();
    } catch (error) {
      console.error('Error generating identity:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFullscreenToggle = () => {
    if (chatWindowRef.current) {
      toggleFullscreen();
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.toggleSound(!soundEnabled);
  };

  return (
    <>
      {currentUser && <NotificationFeed notifications={notifications} />}
      <div 
        ref={chatWindowRef}
        className={`terminal-window w-full max-w-4xl min-w-[320px] h-[80vh] mx-auto my-0 bg-[#001100] border border-neon-green/30 rounded-lg overflow-hidden flex flex-col ${
          isFullscreen ? 'fixed inset-0 max-w-none !m-0 !p-0 rounded-none z-[99] border-none' : 'relative'
        }`}
        style={isFullscreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          margin: 0,
          padding: 0,
          overflow: 'hidden'
        } : {
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className={`terminal-header bg-black/40 px-2 sm:px-4 py-1 sm:py-2 flex justify-between items-center flex-shrink-0 ${
          isFullscreen ? 'border-b border-neon-green/30' : ''
        }`}>
          <div className="flex items-center">
            <div className="header-button bg-red-500 w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"></div>
            <div className="header-button bg-yellow-500 w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"></div>
            <div className="header-button bg-green-500 w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"></div>
            <span className="ml-2 sm:ml-4 font-mono text-[10px] sm:text-xs md:text-sm flex items-center text-neon-green">
              <Terminal className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> GLOBAL_CHAT
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {isConnected ? (
              <div className="flex items-center gap-1 text-neon-green">
                <Wifi className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">CONNECTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">DISCONNECTED</span>
              </div>
            )}
            <Button
              onClick={toggleSound}
              className="bg-transparent border-none text-neon-green hover:bg-neon-green/10 p-0.5 sm:p-1"
            >
              {soundEnabled ? (
                <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            <Button
              onClick={handleFullscreenToggle}
              className="bg-transparent border-none text-neon-green hover:bg-neon-green/10 p-0.5 sm:p-1"
            >
              {isFullscreen ? (
                <Minimize className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Maximize className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            {currentUser && (
              <UsernameBadge 
                username={currentUser.username} 
                color={currentUser.color}
                showIcon 
                className="mr-2 sm:mr-3 scale-75 sm:scale-90 md:scale-100"
              />
            )}
            <OnlineCounter count={onlineUsers} />
          </div>
        </div>
        
        <div className="terminal-body bg-black p-0 flex flex-col flex-grow overflow-hidden relative">
          <div className="scan-line-effect pointer-events-none"></div>
          
          <div 
            ref={messageContainerRef}
            className="message-container flex-1 overflow-y-auto scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-neon-green/50 hover:scrollbar-thumb-neon-green/70 pr-1 sm:pr-2"
            style={{
              position: 'relative',
              zIndex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              height: isFullscreen ? undefined : 'calc(100% - 60px)',
              paddingBottom: isFullscreen ? '0' : '60px'
            }}
          >
            <MessageList 
              messages={messages} 
              onReplyClick={handleReplyClick}
            />
          </div>
          
          <div className="flex-shrink-0">
            {typingUsersList.length > 0 && (
              <TypingIndicator users={typingUsersList} />
            )}
          </div>
          
          {!currentUser ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#001100]/90 backdrop-blur-sm z-10">
              <div className="glass-panel p-4 sm:p-8 max-w-md text-center border border-neon-green/30 rounded-lg bg-black/40">
                <h2 className="text-xl sm:text-2xl font-mono font-bold mb-2 sm:mb-4 text-neon-green">CHATROPOLIS</h2>
                <p className="mb-4 sm:mb-6 text-sm sm:text-base text-neon-green/70">
                  Enter the global chat anonymously. No logs, no history.
                </p>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isGenerating}
                  className="bg-transparent border border-neon-green text-neon-green hover:bg-neon-green/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-xs sm:text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin text-neon-green animate-pulse" />
                      <span className="font-mono animate-pulse">Generating Identity...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-mono">Generate Identity</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <form 
              ref={formRef}
              onSubmit={handleSendMessage} 
              className={`input-form flex-shrink-0 pt-2 pb-2 flex flex-col gap-1 sm:gap-2 bg-[#000F00] px-2 ${
                isFullscreen ? 'fixed bottom-0 left-0 right-0 z-50' : 'absolute bottom-0 left-0 right-0 z-10'
              }`}
              style={{
                backgroundColor: '#000F00',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
                ...(isFullscreen ? {
                  position: 'fixed',
                  bottom: window.visualViewport?.height 
                    ? `${window.innerHeight - window.visualViewport.height}px` 
                    : '0'
                } : {
                  position: 'absolute',
                  bottom: 0
                })
              }}
            >
              {replyingTo && (
                <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded bg-black/40 border border-neon-green/30">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Replying to</span>
                  <UsernameBadge 
                    username={replyingTo.username} 
                    color={replyingTo.userColor}
                    className="scale-75 sm:scale-90"
                  />
                  <span className="text-xs sm:text-sm truncate">{replyingTo.content}</span>
                  <Button
                    type="button"
                    className="h-5 w-5 sm:h-6 sm:w-6 ml-auto text-muted-foreground hover:text-neon-green"
                    onClick={handleCancelReply}
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-1 sm:gap-2">
                <Input
                  ref={inputRef}
                  value={messageInput}
                  onChange={handleMessageInput}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  className="font-mono text-xs sm:text-sm bg-black/40 text-white border-white/20 rounded-md focus:border-white/50 focus:ring-white/10 placeholder-white/30 min-w-0"
                />
                <Button 
                  type="submit" 
                  className="bg-transparent border border-white/20 text-white hover:bg-white/5 transition-all rounded-md px-2 sm:px-3 flex-shrink-0"
                  disabled={!messageInput.trim()}
                >
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
