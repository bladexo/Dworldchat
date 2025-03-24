import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { generateUsername, generateUserColor } from '../utils/usernameGenerator';
import { toast } from 'sonner';
import { Notification } from '@/components/NotificationFeed';
import { debounce } from 'lodash';

// Constants
const MAX_MESSAGES = 100; // Maximum number of messages to keep in history

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
}

// Define the context type
interface ChatContextType {
  messages: ChatMessage[];
  currentUser: User | null;
  onlineUsers: number;
  notifications: Notification[];
  sendMessage: (content: string, replyTo?: ChatMessage) => void;
  createUser: () => Promise<boolean>;
  typingUsers: Map<string, { username: string; color: string }>;
  handleInputChange: (content: string) => void;
  isConnected: boolean;
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
  const MESSAGE_COOLDOWN = 500; // 500ms between messages
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; color: string }>>(new Map());
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
  }, []);

  const validateMessage = (content: string): boolean => {
    if (!content || typeof content !== 'string') return false;
    if (content.length > 1000) return false;
    if (content.trim().length === 0) return false;
    return true;
  };

  // Create user
  const createUser = useCallback(async () => {
    if (!socket || !isConnected) {
      toast.error('Waiting for server connection...');
      return false;
    }

    // Only prevent registration if we have a current user
    if (currentUser) {
      console.log('User already registered, skipping registration');
      return true;
    }

    console.log('Creating new user');
    const username = `User${Math.floor(Math.random() * 1000)}`;
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    const user: User = {
      id: socket.id,
      username,
      color
    };

    return new Promise<boolean>((resolve) => {
      const handleError = (error: string) => {
        console.error('Registration error:', error);
        toast.error(error);
        socket?.off('error', handleError);
        socket?.off('registration_success', handleSuccess);
        resolve(false);
      };

      const handleSuccess = (data: { username: string; color: string }) => {
        console.log('Registration success:', data);
        setCurrentUser(user);
        toast.success(`Welcome, ${username}!`);
        socket?.off('error', handleError);
        socket?.off('registration_success', handleSuccess);
        resolve(true);
      };

      // Remove any existing listeners before adding new ones
      socket.off('error', handleError);
      socket.off('registration_success', handleSuccess);

      socket.on('error', handleError);
      socket.on('registration_success', handleSuccess);

      // Generate a simple public key for the user
      const publicKey = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('Emitting register event with:', { username: user.username, publicKey });
      socket.emit('register', {
        username: user.username,
        publicKey
      });

      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        socket?.off('error', handleError);
        socket?.off('registration_success', handleSuccess);
        resolve(false);
        toast.error('Registration timed out. Please try again.');
      }, 10000); // 10 second timeout

      // Cleanup function
      return () => {
        clearTimeout(timeout);
        socket?.off('error', handleError);
        socket?.off('registration_success', handleSuccess);
      };
    });
  }, [socket, isConnected, currentUser]);

  const sendMessage = useCallback((content: string, replyTo?: ChatMessage) => {
    if (!socket || !currentUser) return;
    
    if (!validateMessage(content)) {
      toast.error('Invalid message content');
      return;
    }

    const now = Date.now();
    if (now - lastMessageTime < MESSAGE_COOLDOWN) {
      toast.error('Please wait before sending another message');
      return;
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
  }, [socket, currentUser, lastMessageTime]);

  useEffect(() => {
    if (!socket) return;

    socket.on('registration_success', ({ username, color }) => {
      setCurrentUser({ id: socket.id, username, color });
      setIsConnected(true);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error);
    });

    socket.on('chat_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user_joined', (data) => {
      setOnlineUsers(data.onlineCount);
    });

    socket.on('user_left', (data) => {
      setOnlineUsers(prev => Math.max(0, prev - 1));
    });

    socket.on('online_count', (data) => {
      setOnlineUsers(data.count);
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

    return () => {
      socket.off('registration_success');
      socket.off('error');
      socket.off('chat_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('online_count');
      socket.off('mention');
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
