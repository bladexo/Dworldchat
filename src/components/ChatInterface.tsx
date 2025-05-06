import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage, RoomTheme } from '@/context/ChatContext';
import MessageList from './MessageList';
import UsernameBadge from './UsernameBadge';
import OnlineCounter from './OnlineCounter';
import { Button } from '@/components/ui/button';
import { Terminal, Send, UserPlus, Loader2, X, Wifi, WifiOff, Minimize, Maximize, Volume2, VolumeX, Plus, DoorOpen, LogOut, Settings, Trophy, ThumbsUp, Target, Shuffle } from 'lucide-react';
import NotificationFeed from './NotificationFeed';
import TypingIndicator from './TypingIndicator';
import { soundManager } from '@/utils/sound';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { Textarea } from '@/components/ui/textarea';
import RoomCreateModal from './RoomCreateModal';
import RoomJoinModal from './RoomJoinModal';
import RoomSettings from './RoomSettings';
import Leaderboard from './Leaderboard';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Simple theme colors - just the basics
interface ThemeColorConfig {
  bg: string;
  text: string;
  border: string;
  isPremium?: boolean;
}

const themeColors: Record<string, ThemeColorConfig> = {
  terminal: {
    bg: 'bg-[#001100]',
    text: 'text-neon-green',
    border: 'border-neon-green/30'
  },
  cyberpunk: {
    bg: 'bg-[#0a001a]',
    text: 'text-pink-400',
    border: 'border-pink-500/40'
  },
  retro: {
    bg: 'bg-[#2e1a11]',
    text: 'text-amber-400',
    border: 'border-amber-500/40'
  },
  minimal: {
    bg: 'bg-[#0f1115]',
    text: 'text-blue-400',
    border: 'border-blue-500/30'
  },
  hacker: {
    bg: 'bg-[#000500]',
    text: 'text-green-500',
    border: 'border-green-700/40'
  },
  premium: {
    bg: 'bg-white',
    text: 'text-blue-800',
    border: 'border-blue-500',
    isPremium: true // Flag to indicate this is a premium theme that affects the entire page
  }
};

const ChatInterface: React.FC = () => {
  const { 
    messages, 
    currentUser, 
    onlineUsers, 
    notifications, 
    sendMessage, 
    createUser, 
    typingUsers, 
    handleInputChange, 
    isConnected, 
    isMuted, 
    muteTimeRemaining,
    currentRoom,
    leaveRoom,
    sendRoomMessage,
    roomMessages,
    joinRoom,
    sendMessageReaction,
    hasHackAccess,
    hackAccessInfo,
    executeHack,
    leaderboard,
    currentUserPoints,
    socket,
    isReconnecting,
    reconnectAttempts,
  } = useChat();
  
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
  
  // Room modals
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  
  // Flag to track if we need to reload for premium theme
  const [needsReload, setNeedsReload] = useState(false);
  const previousThemeRef = useRef<string | null>(null);

  const typingUsersList = Array.from(typingUsers)
    .filter(([id, _]) => id !== currentUser?.id)
    .map(([_, user]) => user);

  const [isHacking, setIsHacking] = useState(false);
  const [isHackModalOpen, setIsHackModalOpen] = useState(false);
  const [hackTarget, setHackTarget] = useState<string>('');
  const [hackMode, setHackMode] = useState<'random' | 'specific'>('random');

  // Add state to track when hack access changes
  const [hackAccessJustChanged, setHackAccessJustChanged] = useState(false);
  
  // Listen for hack access changes and show notification
  useEffect(() => {
    if (hasHackAccess) {
      setHackAccessJustChanged(true);
      
      // Reset the notification effect after 5 seconds
      const timer = setTimeout(() => {
        setHackAccessJustChanged(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [hasHackAccess, hackAccessInfo]);

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
  
  // Add room message scroll handler
  useEffect(() => {
    if (messageContainerRef.current && roomMessages.length > 0) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [roomMessages]);

  // Enhanced viewport height management
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const handleVisualViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport || !isMobile || !isFullscreen) return;

      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
      const keyboardHeight = window.innerHeight - viewport.height;

        // Simple fixed positioning for the container
      if (chatWindowRef.current) {
        chatWindowRef.current.style.position = 'fixed';
        chatWindowRef.current.style.top = '0';
        chatWindowRef.current.style.left = '0';
        chatWindowRef.current.style.right = '0';
        chatWindowRef.current.style.bottom = '0';
      }

        // Message container adjusts its height based on keyboard
      if (messageContainerRef.current) {
        const headerHeight = 48; // Header height
        const inputHeight = 56; // Input form height
        const availableHeight = viewport.height - headerHeight - inputHeight;
        messageContainerRef.current.style.height = `${availableHeight}px`;
        messageContainerRef.current.style.overflowY = 'auto';
      }

      // Form moves up with keyboard
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
      return `Wait ${cooldown}s...`;
    }
    if (currentRoom) {
      return `Message ${currentRoom.name}...`;
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
      let sent;
      
      if (currentRoom) {
        sent = sendRoomMessage(input, replyingTo);
      } else {
        sent = sendMessage(input, replyingTo);
      }
      
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
    // Focus the textarea when replying
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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

  const handleLeaveRoom = () => {
    leaveRoom();
    setReplyingTo(null);
  };
  
  const getChatTitle = () => {
    if (currentRoom) {
      return currentRoom.name;
    }
    return 'GLOBAL_CHAT';
  };

  // Get the current theme colors based on the room
  const getThemeColors = () => {
    if (!currentRoom) return themeColors.terminal;
    
    const theme = currentRoom.theme || 'terminal';
    return themeColors[theme] || themeColors.terminal;
  };
  
  const themeColor = getThemeColors();

  // Premium theme handler - applies theme to entire document and handles reloads as needed
  useEffect(() => {
    if (!currentRoom) {
      // Reset to default when leaving a room
      document.documentElement.classList.remove('theme-premium');
      previousThemeRef.current = null;
      return;
    }
    
    const theme = currentRoom.theme || 'terminal';
    const themeConfig = themeColors[theme] || themeColors.terminal;
    
    // Check if this is a premium theme
    if (themeConfig.isPremium) {
      // Apply premium theme to root element
      document.documentElement.classList.add('theme-premium');
      previousThemeRef.current = theme;
    } else {
      // Non-premium theme
      document.documentElement.classList.remove('theme-premium');
      previousThemeRef.current = theme;
    }
  }, [currentRoom]);

  // Add hack handler to open the modal instead of directly hacking
  const handleHackClick = () => {
    if (hasHackAccess) {
      setIsHackModalOpen(true);
      // Clear the notification state when user clicks the button
      setHackAccessJustChanged(false);
    } else {
      toast.error('You do not have hack access. Ask an admin for access.');
    }
  };

  // Add function to execute the hack with the selected options
  const handleHackExecute = async () => {
    if (!hasHackAccess) return;
    
    setIsHacking(true);
    setIsHackModalOpen(false);
    
    try {
      // Pass the targeting mode and username to the executeHack function
      executeHack(
        hackMode, 
        hackMode === 'specific' ? hackTarget : undefined
      ).catch(error => {
        console.error('Hack error:', error);
        toast.error('Failed to execute hack');
        setIsHacking(false);
      });
      
      // The loading state will be cleared by the hack_completed event
      // We don't need to manually handle success/error notifications here
      // as they're handled by the server-side notification system
      
    } finally {
      // Reset hack options
      setHackTarget('');
      setHackMode('random');
    }
  };

  // Listen for hack completion to stop loading state
  useEffect(() => {
    if (!socket) return;

    const handleHackCompleted = () => {
      setIsHacking(false);
    };

    socket.on('hack_completed', handleHackCompleted);

    return () => {
      socket.off('hack_completed', handleHackCompleted);
    };
  }, [socket]);

  return (
    <>
      {currentUser && <NotificationFeed notifications={notifications} />}
      {needsReload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className={`p-6 rounded-lg border ${themeColor.border} ${themeColor.bg} max-w-md text-center`}>
            <h3 className={`text-xl mb-4 font-bold ${themeColor.text}`}>Premium Theme Activation</h3>
            <p className={`mb-6 ${currentRoom?.theme === 'premium' ? 'text-gray-600' : 'text-gray-300'}`}>
              This premium theme requires a page reload to fully apply all visual effects. Your session will be preserved.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => window.location.reload()}
                className={`${themeColor.bg} border ${themeColor.border} ${themeColor.text} hover:bg-${themeColor.text.split('-')[1]}/20`}
              >
                Reload Now
              </Button>
              <Button 
                onClick={() => setNeedsReload(false)} 
                variant="outline"
                className={`${currentRoom?.theme === 'premium' ? 'text-gray-500 hover:text-gray-800' : 'text-gray-400 hover:text-white'}`}
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
      <div 
        ref={chatWindowRef}
        className={`terminal-window w-full max-w-4xl min-w-[320px] h-[80vh] mx-auto my-0 ${themeColor.bg} border ${themeColor.border} rounded-lg overflow-hidden flex flex-col ${
          isFullscreen ? 'fixed inset-0 max-w-none !m-0 !p-0 rounded-none z-[99] border-none' : 'relative'
        } ${currentRoom?.theme === 'premium' ? 'shadow-lg !bg-white' : ''}`}
        style={{
          ...(isFullscreen ? {
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
          }),
          ...(currentRoom?.theme === 'premium' ? {
            backgroundColor: 'white',
            background: 'white'
          } : {})
        }}
      >
        <div className={`terminal-header ${currentRoom?.theme === 'premium' ? 'bg-blue-50 !border-blue-400' : 'bg-black/40'} px-2 sm:px-4 py-1 sm:py-2 flex justify-between items-center flex-shrink-0 ${
          isFullscreen ? `border-b ${themeColor.border}` : ''
        }`}
        style={{
          ...(currentRoom?.theme === 'premium' ? {
            backgroundColor: '#eff6ff',
            borderBottomColor: 'rgba(96, 165, 250, 0.7)'
          } : {})
        }}
        >
          <div className="flex items-center">
            <div className="header-button bg-red-500 w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"></div>
            <div className="header-button bg-yellow-500 w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"></div>
            <div className="header-button bg-green-500 w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"></div>
            <span className={`ml-2 sm:ml-4 font-mono text-[10px] sm:text-xs md:text-sm flex items-center ${themeColor.text}`}>
              <Terminal className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> {getChatTitle()}
            </span>
            
            {/* Room action buttons */}
            {currentUser && (
              <div className="ml-2 sm:ml-4 flex items-center gap-1 sm:gap-2">
                {currentRoom ? (
                  <>
                    <Button
                      onClick={() => setSettingsOpen(true)}
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-1 sm:px-2 text-[10px] sm:text-xs ${themeColor.text} hover:bg-white/5`}
                    >
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                      <span className="hidden sm:inline">SETTINGS</span>
                    </Button>
                    <Button
                      onClick={handleLeaveRoom}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 sm:px-2 text-[10px] sm:text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                      <span className="hidden sm:inline">LEAVE</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setCreateRoomOpen(true)}
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-1 sm:px-2 text-[10px] sm:text-xs ${themeColor.text} hover:bg-white/5`}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                      <span className="hidden sm:inline">CREATE</span>
                    </Button>
                    <Button
                      onClick={() => setJoinRoomOpen(true)}
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-1 sm:px-2 text-[10px] sm:text-xs ${themeColor.text} hover:bg-white/5`}
                    >
                      <DoorOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                      <span className="hidden sm:inline">JOIN</span>
                    </Button>
                  </>
                )}
                
                {/* Add leaderboard button */}
                <Button
                  onClick={() => setLeaderboardOpen(true)}
                  variant="ghost"
                  size="sm"
                  className={`h-6 px-1 sm:px-2 text-[10px] sm:text-xs ${themeColor.text} hover:bg-white/5`}
                >
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                  <span className="hidden sm:inline">RANKS</span>
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {isConnected ? (
              <div className="flex items-center gap-1 text-neon-green">
                <Wifi className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">CONNECTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className={`h-4 w-4 sm:h-5 sm:w-5 ${isReconnecting ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">
                  {isReconnecting ? `RECONNECTING${'.'.repeat(reconnectAttempts % 4)}` : 'DISCONNECTED'}
                </span>
              </div>
            )}
            <Button
              onClick={toggleSound}
              className={`bg-transparent border-none ${themeColor.text} hover:bg-white/5 p-0.5`}
            >
              {soundEnabled ? (
                <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            <Button
              onClick={handleFullscreenToggle}
              className={`bg-transparent border-none ${themeColor.text} hover:bg-white/5 p-0.5`}
            >
              {isFullscreen ? (
                <Minimize className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Maximize className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            {currentUser && (
              <>
                <UsernameBadge 
                  username={currentUser.username} 
                  color={currentUser.color}
                  showIcon 
                  className="scale-75 sm:scale-90 md:scale-100"
                />
                <span className="text-[10px] sm:text-xs font-mono text-neon-green ml-1">
                  {currentUserPoints} pts
                </span>
                <OnlineCounter count={onlineUsers} />
              </>
            )}
          </div>
        </div>
        
        <div className={`terminal-body ${currentRoom?.theme === 'premium' ? 'bg-white !p-0' : 'bg-black p-0'} flex flex-col flex-grow overflow-hidden relative`}
        style={{
          ...(currentRoom?.theme === 'premium' ? {
            backgroundColor: 'white',
            background: 'white'
          } : {})
        }}
        >
          {currentRoom?.theme !== 'premium' && <div className="scan-line-effect pointer-events-none"></div>}
          
          <div 
            ref={messageContainerRef}
            className={`message-container flex-1 overflow-y-auto ${
              currentRoom?.theme === 'premium' 
                ? 'scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-blue-300/70 hover:scrollbar-thumb-blue-400 !bg-white'
                : 'scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-neon-green/50 hover:scrollbar-thumb-neon-green/70'
            } pr-1 sm:pr-2`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: isFullscreen ? '56px' : '60px',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              zIndex: 1,
              ...(currentRoom?.theme === 'premium' ? {
                backgroundColor: 'white',
                background: 'white'
              } : {})
            }}
          >
            <MessageList 
              messages={currentRoom ? roomMessages : messages} 
              onReplyClick={handleReplyClick}
            />
            {typingUsersList.length > 0 && (
              <TypingIndicator users={typingUsersList} />
            )}
          </div>
          
          {!currentUser ? (
            <div className={`absolute inset-0 flex items-center justify-center ${currentRoom?.theme === 'premium' ? 'bg-white/90' : `${themeColor.bg}/90`} backdrop-blur-sm z-10`}
            style={{
              ...(currentRoom?.theme === 'premium' ? {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                background: 'rgba(255, 255, 255, 0.9)'
              } : {})
            }}
            >
              <div className={`glass-panel p-4 sm:p-8 max-w-md text-center border ${themeColor.border} rounded-lg ${currentRoom?.theme === 'premium' ? 'bg-white/90 shadow-lg !bg-white' : 'bg-black/40'}`}
              style={{
                ...(currentRoom?.theme === 'premium' ? {
                  backgroundColor: 'white',
                  background: 'white'
                } : {})
              }}
              >
                <h2 className={`text-xl sm:text-2xl font-mono font-bold mb-2 sm:mb-4 ${themeColor.text}`}>CHATROPOLIS</h2>
                <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${themeColor.text.replace('text', 'text')}/70`}>
                  Enter the global chat anonymously. No logs, no history.
                </p>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isGenerating}
                  className={`bg-transparent border ${themeColor.border} ${themeColor.text} hover:bg-${themeColor.text.split('-')[1]}/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-xs sm:text-sm ${currentRoom?.theme === 'premium' ? 'shadow-sm' : ''}`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin ${themeColor.text} animate-pulse`} />
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
              className={`flex-shrink-0 pt-2 pb-2 flex flex-col gap-1 sm:gap-2 ${currentRoom?.theme === 'premium' ? 'bg-blue-50' : themeColor.bg} px-2 ${
                isFullscreen ? 'fixed bottom-0 left-0 right-0 z-50' : 'absolute bottom-0 left-0 right-0 z-10'
              }`}
              style={{
                backgroundColor: currentRoom?.theme === 'premium' 
                  ? '#eff6ff' // Blue-50 equivalent
                  : themeColor.bg.includes('[') 
                    ? themeColor.bg.replace('bg-[', '').replace(']', '') 
                    : themeColor.bg.replace('bg-', ''),
                boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
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
                <div className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded ${currentRoom?.theme === 'premium' ? 'bg-blue-50/80' : 'bg-black/40'} border ${themeColor.border}`}>
                  <span className={`text-[10px] sm:text-xs ${currentRoom?.theme === 'premium' ? 'text-gray-500' : 'text-muted-foreground'}`}>Replying to</span>
                  <UsernameBadge 
                    username={replyingTo.username} 
                    color={replyingTo.userColor}
                    className="scale-75 sm:scale-90"
                  />
                  <span className={`text-xs sm:text-sm truncate ${themeColor.text}`}>{replyingTo.content}</span>
                  <Button
                    type="button"
                    className={`h-5 w-5 sm:h-6 sm:w-6 ml-auto ${currentRoom?.theme === 'premium' ? 'text-gray-400 hover:text-blue-600' : `text-muted-foreground hover:${themeColor.text}`}`}
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
                  className={`flex-1 ${currentRoom?.theme === 'premium' ? 'bg-white' : themeColor.bg} border ${themeColor.border} ${themeColor.text} ${
                    currentRoom?.theme === 'premium' 
                      ? 'placeholder-blue-600/50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400' 
                      : `placeholder-${themeColor.text.split('-')[1]}/50 focus:ring-1 focus:ring-${themeColor.text.split('-')[1]}/50 focus:border-${themeColor.text.split('-')[1]}/50`
                  } resize-none ${
                    isMuted ? 'opacity-50 cursor-not-allowed border-red-500/30 text-red-500 placeholder-red-500/50' : ''
                  } ${isMobile ? 'placeholder:text-xs' : ''}`}
                  disabled={isMuted}
                  rows={1}
                />
                {replyingTo && (
                  <Button 
                    onClick={() => {
                      if (currentUser && replyingTo.id) {
                        sendMessageReaction(replyingTo.id, 'thumbsup', replyingTo.roomId);
                      }
                    }}
                    className={`${themeColor.bg} border ${themeColor.border} ${themeColor.text} hover:bg-blue-500/20`}
                    disabled={isMuted}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={handleHackClick}
                  className={`
                    ${themeColor.bg} border ${themeColor.border} 
                    text-red-500 hover:text-red-400 hover:bg-red-500/20 transition-colors
                    ${!hasHackAccess ? 'opacity-60' : ''}
                    ${hackAccessJustChanged ? 'animate-pulse ring-2 ring-red-500 ring-opacity-70' : ''}
                  `}
                  title={hasHackAccess 
                    ? hackAccessInfo?.type === 'free'
                      ? 'Unlimited hacks available'
                      : hackAccessInfo?.maxUsages 
                        ? `${hackAccessInfo.maxUsages - hackAccessInfo.usageCount} hacks remaining`
                        : 'Hack available'
                    : 'No hack access - Ask an admin for access'
                  }
                >
                  {isHacking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className={`
                      ${currentRoom?.theme === 'premium' ? '' : 'font-mono'} text-sm
                      ${hackAccessJustChanged ? 'text-red-400 font-bold' : ''}
                    `}>HACK</span>
                  )}
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isMuted}
                  className={`${
                    isMuted 
                      ? 'bg-red-600/20 border-red-500/30 text-red-500 hover:bg-red-600/30' 
                      : currentRoom?.theme === 'premium'
                        ? 'bg-white border-blue-400 text-blue-600 hover:bg-blue-50'
                        : `${themeColor.bg} border ${themeColor.border} ${themeColor.text} hover:bg-${themeColor.text.split('-')[1]}/20`
                  } disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${currentRoom?.theme === 'premium' ? 'shadow-sm' : ''}`}
                >
                  {getButtonText()}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Room Modals */}
      <RoomCreateModal isOpen={createRoomOpen} onOpenChange={setCreateRoomOpen} />
      <RoomJoinModal isOpen={joinRoomOpen} onOpenChange={setJoinRoomOpen} />
      <RoomSettings isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
      <Leaderboard isOpen={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      
      {/* Hack modal */}
      <Dialog open={isHackModalOpen} onOpenChange={setIsHackModalOpen}>
        <DialogContent className={`${themeColor.bg} border ${themeColor.border} ${themeColor.text}`}>
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-mono">EXECUTE HACK</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup 
              value={hackMode} 
              onValueChange={(val) => setHackMode(val as 'random' | 'specific')}
              className="flex justify-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="random" id="random" />
                <Label htmlFor="random" className="flex items-center gap-2 font-mono">
                  <Shuffle className="h-4 w-4" /> Random
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific" className="flex items-center gap-2 font-mono">
                  <Target className="h-4 w-4" /> Specific
                </Label>
              </div>
            </RadioGroup>
            
            {hackMode === 'specific' && (
              <div className="mt-4">
                <Label htmlFor="target-username" className="mb-2 block font-mono">Target Username</Label>
                <Input 
                  id="target-username"
                  value={hackTarget}
                  onChange={(e) => setHackTarget(e.target.value)}
                  placeholder="Enter username to hack"
                  className={`bg-transparent border ${themeColor.border} ${themeColor.text} font-mono`}
                />
              </div>
            )}
            
            <div className="mt-4 text-center font-mono">
              {hackAccessInfo?.type === 'free' ? (
                <p>You have unlimited hack access</p>
              ) : hackAccessInfo?.maxUsages ? (
                <p>You have {hackAccessInfo.maxUsages - hackAccessInfo.usageCount} hack attempts remaining</p>
              ) : null}
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsHackModalOpen(false)} variant="outline" className="font-mono">Cancel</Button>
            <Button onClick={handleHackExecute} className="bg-red-600 hover:bg-red-700 font-mono">Execute Hack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatInterface;
