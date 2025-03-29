import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '@/context/ChatContext';
import MessageList from './MessageList';
import UsernameBadge from './UsernameBadge';
import OnlineCounter from './OnlineCounter';
import { Button } from '@/components/ui/button';
import { Terminal, Send, UserPlus, Loader2, X, Wifi, WifiOff, Minimize, Maximize, Volume2, VolumeX } from 'lucide-react';
import NotificationFeed from './NotificationFeed';
import TypingIndicator from './TypingIndicator';
import { soundManager } from '@/utils/sound';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { Textarea } from '@/components/ui/textarea';

const ChatInterface: React.FC = () => {
  const { messages, currentUser, onlineUsers, notifications, sendMessage, createUser, typingUsers, handleInputChange, isConnected, isMuted, muteTimeRemaining } = useChat();
  const [input, setInput] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cooldownRef = useRef<NodeJS.Timeout>();
  const isMobile = useIsMobile();
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

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
      let prevInnerHeight = window.innerHeight;
      let animationFrameId: number;
  
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
      const handleResize = () => {
        if (!isMobile || !isFullscreen) return;
  
        // Get new viewport height
        const newInnerHeight = window.innerHeight;
  
        // Prevent unnecessary updates (for Brave)
        if (newInnerHeight === prevInnerHeight) return;
        prevInnerHeight = newInnerHeight;
  
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
  
        animationFrameId = requestAnimationFrame(() => {
          const keyboardHeight = window.outerHeight - newInnerHeight; 
  
          // Ensure page itself never scrolls
          window.scrollTo(0, 0);
  
          // Fix chat window positioning
          if (chatWindowRef.current) {
            chatWindowRef.current.style.position = 'fixed';
            chatWindowRef.current.style.top = '0';
            chatWindowRef.current.style.left = '0';
            chatWindowRef.current.style.right = '0';
            chatWindowRef.current.style.bottom = '0';
          }
  
          // Adjust message container height
          if (messageContainerRef.current) {
            const headerHeight = 48; // Header height
            const inputHeight = 56; // Input form height
            const availableHeight = newInnerHeight - headerHeight - inputHeight;
            messageContainerRef.current.style.height = `${availableHeight}px`;
            messageContainerRef.current.style.overflowY = 'auto';
          }
  
          // Adjust form position to move with keyboard
          if (formRef.current) {
            formRef.current.style.position = 'fixed';
            formRef.current.style.left = '0';
            formRef.current.style.right = '0';
            formRef.current.style.bottom = `${keyboardHeight}px`;
            formRef.current.style.backgroundColor = '#000F00';
            if (isIOS) {
              formRef.current.style.paddingBottom = 'env(safe-area-inset-bottom)';
            }
          }
        });
      };
  
      if (isMobile && isFullscreen) {
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize);
        handleResize();
        
        return () => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('scroll', handleResize);
        };
      }
  }, [isMobile, isFullscreen]);
  
  // Cleanup when exiting fullscreen mode
  useEffect(() => {
      if (!isFullscreen) {
        if (chatWindowRef.current) {
          chatWindowRef.current.style.position = '';
          chatWindowRef.current.style.top = '';
          chatWindowRef.current.style.left = '';
          chatWindowRef.current.style.right = '';
          chatWindowRef.current.style.bottom = '';
        }
        
        if (messageContainerRef.current) {
          messageContainerRef.current.style.height = '';
          messageContainerRef.current.style.overflowY = '';
          messageContainerRef.current.style.paddingBottom = '60px';
        }
  
        if (formRef.current) {
          formRef.current.style.position = 'absolute';
          formRef.current.style.bottom = '0';
          formRef.current.style.left = '0';
          formRef.current.style.right = '0';
          formRef.current.style.paddingBottom = '4px';
        }
      }
  }, [isFullscreen]);


  // Remove the interval effect since we don't need it anymore
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
              // Auto focus the input when cooldown ends
              setTimeout(() => inputRef.current?.focus(), 0);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  // Format time remaining for mute
  const formatMuteTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Update input placeholder based on mute status
  const getInputPlaceholder = () => {
    if (isMuted && muteTimeRemaining) {
      return `You are muted for ${formatMuteTime(muteTimeRemaining)}`;
    }
    if (!isMuted && cooldown > 0) {
      return `Please wait ${cooldown} seconds before sending another message`;
    }
    return 'Type a message...';
  };

  // Get button text based on status
  const getButtonText = () => {
    if (isMuted && muteTimeRemaining) {
      return `Muted (${formatMuteTime(muteTimeRemaining)})`;
    }
    if (!isMuted && cooldown > 0) {
      return `${cooldown}s`;
    }
    return 'Send';
  };

  // Handle input changes
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isMuted) return; // Prevent input when muted
    setInput(e.target.value);
    handleInputChange(e.target.value);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (input.trim()) {
      const sent = await sendMessage(input, replyingTo);
      if (sent) {
      if (soundEnabled) {
        soundManager.playMessageSound();
      }
        setInput('');
      setReplyingTo(null);
        // Only apply cooldown if user is not muted
        if (!isMuted) {
          setCooldown(5); // Start 5 second cooldown
        }
      }
    }
  };

  const handleReplyClick = (message: ChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
          overflow: 'hidden',
          touchAction: 'none'
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
          <div className="flex items-center gap-0.5 sm:gap-1">
            {isConnected ? (
              <div className="flex items-center gap-1 text-neon-green">
                <Wifi className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">CONNECTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">DISCONNECTED</span>
              </div>
            )}
            <Button
              onClick={toggleSound}
              className="bg-transparent border-none text-neon-green hover:bg-neon-green/10 p-0.5"
            >
              {soundEnabled ? (
                <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            <Button
              onClick={handleFullscreenToggle}
              className="bg-transparent border-none text-neon-green hover:bg-neon-green/10 p-0.5"
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
                className="scale-75 sm:scale-90 md:scale-100"
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
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: isFullscreen ? '56px' : '60px',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              zIndex: 1
            }}
          >
            <MessageList 
              messages={messages} 
              onReplyClick={handleReplyClick}
            />
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
            <div 
              ref={formRef}
              role="presentation"
              className={`flex-shrink-0 pt-2 pb-2 flex flex-col gap-1 sm:gap-2 bg-[#000F00] px-2 ${
                isFullscreen ? 'fixed bottom-0 left-0 right-0 z-50' : 'absolute bottom-0 left-0 right-0 z-10'
              }`}
              style={{
                backgroundColor: '#000F00',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
                ...(isFullscreen ? {
                  position: 'fixed',
                  bottom: window.visualViewport?.height 
                    ? `${window.innerHeight - window.visualViewport.height}px` 
                    : '0',
                  paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)`
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
              <div className="flex gap-1 sm:gap-2 p-1 pb-2">
                <Textarea
                  key={`input-${isMuted}-${muteTimeRemaining}`}
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyPress={handleKeyPress}
                  placeholder={getInputPlaceholder()}
                  className={`flex-1 bg-[#001100] border border-neon-green/30 text-neon-green placeholder-neon-green/50 resize-none focus:ring-1 focus:ring-neon-green/50 focus:border-neon-green/50 ${
                    isMuted ? 'opacity-50 cursor-not-allowed border-red-500/30 text-red-500 placeholder-red-500/50' : ''
                  }`}
                  disabled={isMuted}
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isMuted}
                  className={`${
                    isMuted 
                      ? 'bg-red-600/20 border-red-500/30 text-red-500 hover:bg-red-600/30' 
                      : 'bg-[#001100] border border-neon-green/30 text-neon-green hover:bg-neon-green/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                >
                  {getButtonText()}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
