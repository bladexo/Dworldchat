import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { generateUsername, generateUserColor } from '../utils/usernameGenerator';
import { toast } from 'sonner';
import { Notification } from '@/components/NotificationFeed';
import { debounce } from 'lodash';

// Constants
const MAX_MESSAGES = 100; // Maximum number of messages to keep in history

// Define the mute info type
interface MuteInfo {
  muteUntil: number;
  duration: number;
}

// Define the types for our chat messages
export interface ChatMessage {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  userColor: string;
  mentions?: string[];
  isSystem?: boolean;
  type?: 'system' | 'user';
  replyTo?: {
    id: string;
    username: string;
    content: string;
  }
}

// Define the user type
export interface User {
  id: string;
  username: string;
  color: string;
  muteInfo?: MuteInfo;
}

// Define the context type
interface ChatContextType {
  messages: ChatMessage[];
  currentUser: User | null;
  onlineUsers: number;
  notifications: Notification[];
  sendMessage: (content: string, replyTo?: ChatMessage) => boolean;
  createUser: () => void;
  typingUsers: Map<string, { username: string; color: string }>;
  handleInputChange: (content: string) => void;
  isConnected: boolean;
  isMuted: boolean;
  muteTimeRemaining: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.PROD 
  ? 'https://charming-romola-dinno-3c220cbb.koyeb.app'
  : (import.meta.env.VITE_SERVER_URL || 'http://localhost:8000');

// Provider component
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const MESSAGE_COOLDOWN = 5000; // 5 seconds between messages
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; color: string }>>(new Map());
  const [muteInfo, setMuteInfo] = useState<MuteInfo | null>(null);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    if (!currentUser) return;
    
    const notificationId = `${notification.type}-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id: notificationId
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 5000);
  }, [currentUser]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      // Re-register if reconnecting
      if (currentUser) {
        newSocket.emit('register', {
          username: currentUser.username,
          color: currentUser.color
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      setOnlineUsers(0);
      toast.error('Failed to connect to server');
    });

    // Simple online count update
    newSocket.on('online_count', ({ count }) => {
      console.log('Online users:', count);
      setOnlineUsers(count);
    });

    // Handle user leave - only update online count
    newSocket.on('user_left', () => {
      // No notification needed
    });

    return () => {
      newSocket.close();
    };
  }, [currentUser, addNotification]);

  const validateMessage = (content: string): boolean => {
    if (!content || typeof content !== 'string') return false;
    if (content.length > 1000) return false;
    if (content.trim().length === 0) return false;
    return true;
  };

  // Create user
  const createUser = useCallback(() => {
    if (!socket || !isConnected) {
      toast.error('Waiting for server connection...');
      return;
    }

    const username = `user_${Math.random().toString(36).substr(2, 6)}`;
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    const user: User = {
      id: socket.id,
      username,
      color
    };

    socket.emit('register', {
      username: user.username,
      color: user.color
    });
    
    setCurrentUser(user);
    toast.success(`Welcome, ${username}!`);
  }, [socket, isConnected]);

  // Add mute check interval
  useEffect(() => {
    const checkMuteInterval = setInterval(() => {
      if (muteInfo && Date.now() >= muteInfo.muteUntil) {
        setMuteInfo(null);
      }
    }, 1000);

    return () => clearInterval(checkMuteInterval);
  }, [muteInfo]);

  // Add mute event listener
  useEffect(() => {
    if (!socket) return;

    socket.on('user_muted', ({ duration, muteUntil }) => {
      setMuteInfo({ duration, muteUntil });
      toast.error(`You have been muted for ${duration} minutes`);
    });

    socket.on('user_unmuted', (data) => {
      if (currentUser && data.username === currentUser.username) {
        setMuteInfo(null);
        toast.success('You have been unmuted');
      }
    });

    return () => {
      socket.off('user_muted');
      socket.off('user_unmuted');
    };
  }, [socket, currentUser]);

  const sendMessage = useCallback((content: string, replyTo?: ChatMessage): boolean => {
    if (!socket || !currentUser) return false;
    
    if (muteInfo && Date.now() < muteInfo.muteUntil) {
      const minutesLeft = Math.ceil((muteInfo.muteUntil - Date.now()) / 60000);
      toast.error(`You are muted for ${minutesLeft} more minute${minutesLeft === 1 ? '' : 's'}`);
      return false;
    }

    if (!validateMessage(content)) {
      toast.error('Invalid message content');
      return false;
    }

    const now = Date.now();
    const timeLeft = MESSAGE_COOLDOWN - (now - lastMessageTime);
    if (timeLeft > 0) {
      toast.error(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before sending another message`);
      return false;
    }
    setLastMessageTime(now);

    socket.emit('chat_message', {
      content,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      userColor: currentUser.color,
      replyTo: replyTo ? {
        id: replyTo.id,
        username: replyTo.username,
        content: replyTo.content
      } : undefined
    });
    return true;
  }, [socket, currentUser, lastMessageTime, muteInfo]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat_message', ({ 
      id,
      senderId, 
      senderUsername,
      content,
      timestamp,
      userColor,
      replyTo,
      mentions,
      isSystem,
      type
    }) => {
      const newMessage: ChatMessage = {
        id: id || `${senderId}-${timestamp}`,
        username: senderUsername || 'SYSTEM',
        content,
        timestamp: new Date(timestamp),
        userColor: userColor || '#39ff14',
        replyTo,
        mentions,
        isSystem: isSystem || type === 'system',
        type
      };
      
      console.log('Received message:', newMessage);
      setMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGES));
    });

    socket.on('mention', ({ username, timestamp }) => {
      if (currentUser) {
        addNotification({
          type: 'message',
          username,
          timestamp,
          message: `@${username} mentioned you`
        });
        toast.info(`@${username} mentioned you`);
      }
    });

    socket.on('error', (error) => {
      toast.error(error);
    });

    return () => {
      socket.off('chat_message');
      socket.off('mention');
      socket.off('error');
    };
  }, [socket, currentUser, addNotification]);

  // Add debounced typing handler
  const debouncedStopTyping = useCallback(
    debounce(() => {
      if (socket) {
        socket.emit('typing_stop');
      }
    }, 1000),
    [socket]
  );

  // Handle input changes
  const handleInputChange = (content: string) => {
    if (socket && content) {
      socket.emit('typing_start');
      debouncedStopTyping();
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.set(data.id, { username: data.username, color: data.color });
        return next;
      });
    });

    socket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(data.id);
        return next;
      });
    });

    return () => {
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket]);

  const isMuted = muteInfo !== null && Date.now() < muteInfo.muteUntil;
  const muteTimeRemaining = isMuted ? Math.ceil((muteInfo!.muteUntil - Date.now()) / 60000) : 0;

  const value = {
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
    muteTimeRemaining
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Add this hook export
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
