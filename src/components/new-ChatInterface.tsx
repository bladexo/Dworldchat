import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '@/context/ChatContext';
import MessageList from './MessageList';
import UsernameBadge from './UsernameBadge';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  UserPlus, 
  Loader2, 
  Users, 
  Shield, 
  Sparkles,
  Settings,
  LogOut,
  Trophy
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const ChatInterface: React.FC = () => {
  const { 
    messages, 
    currentUser, 
    onlineUsers, 
    sendMessage, 
    createUser, 
    isConnected,
    currentRoom,
    leaveRoom,
    currentUserPoints,
  } = useChat();
  
  const [input, setInput] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (input.trim() && cooldown === 0) {
      const sent = sendMessage(input);
      if (sent) {
        setInput('');
        setCooldown(3);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateUser = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await createUser();
    } finally {
      setIsGenerating(false);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <div className="chat-window w-full max-w-5xl mx-auto h-[75vh] flex flex-col">
      {/* Header */}
      <div className="chat-header flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse" />
            <span className="text-sm font-medium">
              {currentRoom ? currentRoom.name : 'Global Chat'}
            </span>
          </div>
          
          {currentUser && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{onlineUsers} online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-primary" />
                <span>{currentUserPoints} pts</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              Disconnected
            </div>
          )}
          
          {currentUser && <UsernameBadge username={currentUser.username} color={currentUser.color} />}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-body flex-1 overflow-y-auto">
        {currentUser ? (
          <>
            <MessageList messages={messages} onReplyClick={() => {}} />
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6 animate-slide-up">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shimmer">
                <Shield className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                Join Anonymously
              </h2>
              
              <p className="text-muted-foreground mb-8 text-lg">
                No sign-up required. Click below to generate your anonymous identity and start chatting instantly.
              </p>
              
              <Button 
                onClick={handleCreateUser}
                disabled={isGenerating}
                className="btn-primary group"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                    Generate Identity
                  </>
                )}
              </Button>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Anonymous
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Real-time
                </span>
                <span>•</span>
                <span>No tracking</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      {currentUser && (
        <div className="border-t border-border px-6 py-4 bg-card/30 backdrop-blur-md">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="chat-input flex-1 resize-none"
              rows={1}
              disabled={cooldown > 0}
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || cooldown > 0}
              className="btn-primary px-8"
            >
              {cooldown > 0 ? (
                <span className="font-mono">{cooldown}s</span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          
          {cooldown > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Please wait {cooldown} second{cooldown > 1 ? 's' : ''} before sending another message
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
