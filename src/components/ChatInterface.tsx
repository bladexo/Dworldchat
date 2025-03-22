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
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import ThreadModal from './ThreadModal';
import { Turnstile } from '@marsidev/react-turnstile';
import { toast } from 'react-hot-toast';

const ChatInterface: React.FC = () => {
  const { messages, currentUser, onlineUsers, notifications, sendMessage, createUser, typingUsers, handleInputChange, isConnected } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [cfToken, setCfToken] = useState<string | null>(null);
  const [tokenTimeout, setTokenTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Clear token after 4.5 minutes (before Cloudflare's 5-minute expiry)
  useEffect(() => {
    if (cfToken) {
      // Clear any existing timeout
      if (tokenTimeout) {
        clearTimeout(tokenTimeout);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        setCfToken(null);
        toast.error('Bot verification expired. Please verify again.');
        // Reset the Turnstile widget
        const turnstileElement = document.querySelector<HTMLIFrameElement>('iframe[src*="challenges.cloudflare.com"]');
        if (turnstileElement) {
          turnstileElement.src = turnstileElement.src;
        }
      }, 270000); // 4.5 minutes
      
      setTokenTimeout(timeout);
    }
    
    return () => {
      if (tokenTimeout) {
        clearTimeout(tokenTimeout);
      }
    };
  }, [cfToken]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
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
    if (!cfToken) {
      toast.error('Please complete the bot check');
      return;
    }

    setIsGenerating(true);
    try {
      const success = await createUser(cfToken);
      if (!success) {
        // Reset the Turnstile widget
        setCfToken(null);
        const turnstileElement = document.querySelector<HTMLIFrameElement>('iframe[src*="challenges.cloudflare.com"]');
        if (turnstileElement) {
          turnstileElement.src = turnstileElement.src;
        }
        toast.error('Failed to register. Please try the bot check again.');
      }
    } catch (error) {
      console.error('Error generating identity:', error);
      setCfToken(null);
      toast.error('Failed to register. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.toggleSound(!soundEnabled);
  };

  const handleThreadOpen = (messageId: string) => {
    setActiveThread(messageId);
  };

  const handleThreadClose = () => {
    setActiveThread(null);
  };

  return (
    <>
      {currentUser && <NotificationFeed notifications={notifications} />}
      <div 
        className={cn(
          'terminal-window w-full max-w-4xl min-w-[320px] mx-auto my-0 bg-[#001100] border border-neon-green/30 rounded-lg overflow-hidden flex flex-col',
          isMobile ? 'h-[100vh] !m-0 !p-0 max-w-none' : 'h-[80vh]',
          isFullscreen ? 'fixed top-0 left-0 right-0 bottom-0 max-w-none h-screen !m-0 !p-0 rounded-none z-[99] border-none' : ''
        )}
        style={isFullscreen || isMobile ? { margin: 0, padding: 0 } : undefined}
      >
        <div className={cn(
          'terminal-header bg-black/40 px-2 sm:px-4 py-1 sm:py-2 flex justify-between items-center flex-shrink-0',
          isFullscreen || isMobile ? 'border-b border-neon-green/30' : ''
        )}>
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
            {!isMobile && (
            <Button
              onClick={toggleFullscreen}
              className="bg-transparent border-none text-neon-green hover:bg-neon-green/10 p-0.5 sm:p-1"
            >
              {isFullscreen ? (
                <Minimize className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Maximize className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            )}
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
        
        <div className={`terminal-body bg-black p-0 flex flex-col flex-grow overflow-hidden ${
          isFullscreen ? 'h-[calc(100vh-40px)] !m-0' : 'h-[calc(85vh-3rem)]'
        }`}>
          <div className="scan-line-effect pointer-events-none"></div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-neon-green/50 hover:scrollbar-thumb-neon-green/70 pr-1 sm:pr-2 pb-20">
            <MessageList 
              messages={messages} 
              onReplyClick={handleReplyClick}
              onThreadOpen={handleThreadOpen}
            />
          </div> 
          
          <div className="flex-shrink-0 mt-1 sm:mt-2">
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
                <div className="mb-4">
                  <Turnstile
                    siteKey={import.meta.env.VITE_CLOUDFLARE_SITE_KEY}
                    onSuccess={(token) => setCfToken(token)}
                    className="my-4"
                  />
                </div>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isGenerating || !cfToken}
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
            <form onSubmit={handleSendMessage} className="fixed bottom-0 left-0 right-0 bg-[#000F00] px-2 py-2 border-t border-neon-green/30">
              {replyingTo && (
                <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 mb-2 rounded bg-black/40 border border-neon-green/30">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Replying to</span>
                  <UsernameBadge 
                    username={replyingTo.username} 
                    color={replyingTo.userColor}
                    className="scale-75 sm:scale-90"
                  />
                  <span className="text-xs sm:text-sm truncate">{replyingTo.content}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 sm:h-6 sm:w-6 ml-auto text-muted-foreground hover:text-neon-green"
                    onClick={handleCancelReply}
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  ref={inputRef}
                  value={messageInput}
                  onChange={handleMessageInput}
                  placeholder="Type your message..."
                  className="font-mono text-xs sm:text-sm bg-black/40 text-white border-white/20 rounded-md focus:border-white/50 focus:ring-white/10 placeholder-white/30 min-w-0"
                />
                <Button 
                  type="submit" 
                  className="bg-transparent border border-white/20 text-white hover:bg-white/5 transition-all rounded-md px-3 py-2 flex-shrink-0"
                  disabled={!messageInput.trim()}
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Thread Modal */}
      {activeThread && messages.find(m => m.id === activeThread) && (
        <ThreadModal
          message={messages.find(m => m.id === activeThread)!}
          replies={messages.filter(m => m.replyTo?.id === activeThread)}
          onClose={handleThreadClose}
        />
      )}
    </>
  );
};

export default ChatInterface;
