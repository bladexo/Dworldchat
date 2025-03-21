import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '@/context/ChatContext';
import MessageList from './MessageList';
import UsernameBadge from './UsernameBadge';
import OnlineCounter from './OnlineCounter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, Send, UserPlus, Loader2, X, Wifi, WifiOff, AtSign, Minimize, Maximize } from 'lucide-react';
import NotificationFeed from './NotificationFeed';
import TypingIndicator from './TypingIndicator';

const ChatInterface: React.FC = () => {
  const { messages, currentUser, onlineUsers, notifications, sendMessage, createUser, typingUsers, handleInputChange, isConnected } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const typingUsersList = Array.from(typingUsers)
    .filter(([id, _]) => id !== currentUser?.id)
    .map(([_, user]) => user);

  // Get list of online users for mentions
  const availableUsers = Array.from(typingUsers.values())
    .filter(user => user.username !== currentUser?.username);

  // Filter users based on what's typed after @
  const filteredUsers = availableUsers.filter(user => 
    user.username.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  useEffect(() => {
    if (currentUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput, replyingTo);
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

    // Check for @ symbol
    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = newValue.slice(lastAtIndex + 1);
      // If there's no space after @, we're in mention mode
      if (!afterAt.includes(' ')) {
        setIsMentioning(true);
        setMentionStart(lastAtIndex);
        setMentionFilter(afterAt);
      } else {
        setIsMentioning(false);
        setMentionStart(-1);
        setMentionFilter('');
      }
    } else {
      setIsMentioning(false);
      setMentionStart(-1);
      setMentionFilter('');
    }
  };

  const handleMentionSelect = (username: string) => {
    if (mentionStart >= 0) {
      const before = messageInput.slice(0, mentionStart);
      const after = messageInput.slice(mentionStart + mentionFilter.length + 1);
      setMessageInput(`${before}@${username} ${after}`);
      setIsMentioning(false);
      setMentionStart(-1);
      setMentionFilter('');
      inputRef.current?.focus();
    }
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      {currentUser && !isFullscreen && <NotificationFeed notifications={notifications} />}
      <div 
        className={`terminal-window w-full max-w-4xl h-[80vh] mx-auto my-8 bg-[#001100] border border-neon-green/30 rounded-lg overflow-hidden flex flex-col ${
          isFullscreen ? 'fixed top-0 left-0 right-0 bottom-0 max-w-none h-screen !m-0 !p-0 rounded-none z-[99] border-none' : ''
        }`}
        style={isFullscreen ? { margin: 0, padding: 0 } : undefined}
      >
        <div className={`terminal-header bg-black/40 px-4 py-2 flex justify-between items-center flex-shrink-0 ${
          isFullscreen ? 'border-b border-neon-green/30' : ''
        }`}>
          <div className="flex items-center">
            <div className="header-button bg-red-500 w-3 h-3 rounded-full mr-2"></div>
            <div className="header-button bg-yellow-500 w-3 h-3 rounded-full mr-2"></div>
            <div className="header-button bg-green-500 w-3 h-3 rounded-full mr-2"></div>
            <span className="ml-4 font-mono text-xs md:text-sm flex items-center text-neon-green">
              <Terminal className="h-4 w-4 mr-2" /> GLOBAL_CHAT
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-1 text-neon-green">
                <Wifi className="h-4 w-4 animate-pulse" />
                <span className="text-xs font-mono">CONNECTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs font-mono">DISCONNECTED</span>
              </div>
            )}
            <Button
              onClick={toggleFullscreen}
              className="bg-transparent border-none text-neon-green hover:bg-neon-green/10 p-1"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            {currentUser && (
              <UsernameBadge 
                username={currentUser.username} 
                color={currentUser.color}
                showIcon 
                className="mr-3"
              />
            )}
            <OnlineCounter count={onlineUsers} />
          </div>
        </div>
        
        <div className={`terminal-body bg-[#001100] p-4 flex flex-col flex-grow overflow-hidden ${
          isFullscreen ? 'h-[calc(100vh-40px)] !m-0' : 'h-[calc(80vh-3rem)]'
        }`}>
          <div className="scan-line-effect pointer-events-none"></div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-neon-green/50 hover:scrollbar-thumb-neon-green/70 pr-2">
            <MessageList 
              messages={messages} 
              onReplyClick={handleReplyClick}
            />
          </div>
          
          <div className="flex-shrink-0 mt-2">
            {typingUsersList.length > 0 && (
              <TypingIndicator users={typingUsersList} />
            )}
          </div>
          
          {!currentUser ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#001100]/90 backdrop-blur-sm z-10">
              <div className="glass-panel p-8 max-w-md text-center border border-neon-green/30 rounded-lg bg-black/40">
                <h2 className="text-2xl font-mono font-bold mb-4 text-neon-green">CHATROPOLIS</h2>
                <p className="mb-6 text-neon-green/70">
                  Enter the global chat anonymously. No logs, no history.
                </p>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isGenerating}
                  className="bg-transparent border border-neon-green text-neon-green hover:bg-neon-green/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-neon-green animate-pulse" />
                      <span className="font-mono animate-pulse">Generating Identity...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span className="font-mono">Generate Identity</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex-shrink-0 pt-4 flex flex-col gap-2 bg-[#001100]">
              {replyingTo && (
                <div className="flex items-center gap-2 p-2 rounded bg-black/40 border border-neon-green/30">
                  <span className="text-xs text-muted-foreground">Replying to</span>
                  <UsernameBadge 
                    username={replyingTo.username} 
                    color={replyingTo.userColor}
                    className="scale-90"
                  />
                  <span className="text-sm truncate">{replyingTo.content}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto text-muted-foreground hover:text-neon-green"
                    onClick={handleCancelReply}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 relative">
                <Input
                  ref={inputRef}
                  value={messageInput}
                  onChange={handleMessageInput}
                  placeholder="Type your message..."
                  className={`font-mono bg-black/40 text-neon-green border-neon-green/30 rounded-md focus:border-neon-green focus:ring-neon-green/20 placeholder-neon-green/50 ${
                    isMentioning ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
                  }`}
                />
                {isMentioning && (
                  <div className="absolute -top-40 left-0 bg-black/80 border border-blue-500 rounded-md w-64 max-h-32 overflow-y-auto">
                    <div className="px-2 py-1 border-b border-blue-500/30 flex items-center gap-2">
                      <AtSign className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-mono text-blue-500">Mention a user</span>
                    </div>
                    {filteredUsers.length > 0 ? (
                      <div className="py-1">
                        {filteredUsers.map(user => (
                          <button
                            key={user.username}
                            onClick={() => handleMentionSelect(user.username)}
                            className="w-full px-2 py-1 hover:bg-blue-500/10 flex items-center gap-2 text-left"
                          >
                            <UsernameBadge 
                              username={user.username}
                              color={user.color}
                              className="scale-90"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2 py-1 text-xs text-gray-400">
                        No users found
                      </div>
                    )}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="bg-transparent border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all rounded-md px-3"
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
    </>
  );
};

export default ChatInterface;
