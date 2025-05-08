import React, { createContext, useContext, useEffect, useState, useCallback, useRef, FC, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { generateUsername, generateUserColor } from '../utils/usernameGenerator';
import { toast } from 'sonner';
import { Notification } from '@/components/NotificationFeed';
import { debounce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

// DEBUG CONFIG - SET TO TRUE TO ENABLE VERBOSE LOGGING
const DEBUG_MODE = true;
const logDebug = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
};

// Constants
const MAX_MESSAGES = 100; // Maximum number of messages to keep in history
const RECONNECT_MAX_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const RECONNECT_INTERVAL = 3000; // 3 seconds

// Room themes
export type RoomTheme = 'terminal' | 'cyberpunk' | 'retro' | 'minimal' | 'hacker' | 'premium';

// Room interface
export interface Room {
  id: string;
  name: string;
  adminId?: string; // ID of the room creator/admin
  theme: RoomTheme;
  createdAt: Date;
  code: string;
  members: string[]; // Array of user IDs in the room
  settings?: {
    isPrivate?: boolean;
    maxUsers?: number;
    allowGuests?: boolean;
    [key: string]: any; // Allow for additional settings
  };
}

// Define the mute info type
interface MuteInfo {
  muteUntil: number;
  duration: number;
}

// Define the types for our chat messages
export interface ChatMessage {
  id: string;
  username: string;
  userColor: string;
  content: string;
  timestamp: Date;
  roomId: string;
  isSystem?: boolean;
  replyTo?: {
    id: string;
    username: string;
    content: string;
  };
  reactions?: {
    [key: string]: string[]; // type -> array of usernames
  };
  type?: 'system' | 'user';
  mentions?: string[];
}

// Define the user type
export interface User {
  id: string;
  username: string;
  color: string;
  muteInfo?: MuteInfo;
  identity?: string; // Added identity field for persistent identification
}

// Define the leaderboard stats type
export interface UserMessageStats {
  username: string;
  color: string;
  messageCount: number;
  reactionCount: number;
  points: number;
  lastActive: Date;
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
  socket: Socket | null;
  currentUserPoints: number;
  
  // Room related functions and state
  currentRoom: Room | null;
  createRoom: (name: string, theme: RoomTheme) => Promise<Room>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendRoomMessage: (content: string, replyTo?: ChatMessage) => boolean;
  roomMessages: ChatMessage[];
  sendMessageReaction: (messageId: string, reactionType: string, roomId?: string) => void;
  extractMentions: (content: string) => string[];
  leaderboard: UserMessageStats[];
  globalStats: {
    totalMessages: number;
    totalReactions: number;
    totalUsers: number;
    averageMessagesPerUser: number;
  };
  // Add hack-related properties
  hasHackAccess: boolean;
  hackAccessInfo: {
    type: string;
    usageCount: number;
    maxUsages: number | null;
  } | null;
  executeHack: (targetMode?: 'random' | 'specific', targetUsername?: string) => Promise<{ 
    success: boolean; 
    stolenPoints: number; 
    victims: string[];
    message?: string;
  }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.PROD 
  ? 'https://nutty-annabell-loganrustyy-25293412.koyeb.app'
  : (import.meta.env.VITE_SERVER_URL || 'http://localhost:8000');

// Log socket configuration 
console.log('[SOCKET CONFIG] Using server URL:', SOCKET_URL, 'Environment:', import.meta.env.MODE);

// Room storage - maps room codes to room data
// This is kept in memory to maintain room metadata across joins
const roomRegistry = new Map<string, Room>();

// Constants
const MAX_RECONNECT_ATTEMPTS = 5;
const SOCKET_CONFIG = {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  timeout: 20000,
  autoConnect: false, // Don't connect automatically
  forceNew: false,
  // Add specific timeouts to prevent premature disconnects
  pingTimeout: 60000,
  pingInterval: 25000,
  // Add upgrade transport options
  upgrade: true,
  rememberUpgrade: true,
  // Add additional options for stability
  rejectUnauthorized: false
};

// Provider component
export const ChatProvider: FC<{ children: ReactNode }> = ({ children }) => {
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
  const [isMuted, setIsMuted] = useState(false);
  const [muteTimeRemaining, setMuteTimeRemaining] = useState(0);
  const muteInfoRef = useRef<MuteInfo | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add reconnection state
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Room state
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<UserMessageStats[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalMessages: 0,
    totalReactions: 0,
    totalUsers: 0,
    averageMessagesPerUser: 0
  });

  // Set hack access state
  const [hasHackAccess, setHasHackAccess] = useState<boolean>(false);
  const [hackAccessInfo, setHackAccessInfo] = useState<{
    type: string;
    usageCount: number;
    maxUsages: number | null;
  } | null>(null);

  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);

  // Add connection stability monitoring
  const disconnectCount = useRef(0);
  const lastDisconnectTime = useRef(Date.now());

  // Add a flag to track intentional disconnections
  const [isIntentionalDisconnect, setIsIntentionalDisconnect] = useState(false);

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

  // Helper function to get stored user identity from sessionStorage
  const getStoredIdentity = () => {
    try {
      return sessionStorage.getItem('chat_identity');
    } catch (error) {
      console.error('Error accessing sessionStorage:', error);
      return null;
    }
  };

  // Helper function to save user identity to sessionStorage
  const saveIdentity = (identity: string) => {
    try {
      sessionStorage.setItem('chat_identity', identity);
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  };

  // Helper function to get stored user from sessionStorage
  const getStoredUser = () => {
    try {
      const storedUser = sessionStorage.getItem('chat_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error accessing sessionStorage:', error);
      return null;
    }
  };

  // Helper function to save user to sessionStorage
  const saveUser = (user: User) => {
    try {
      sessionStorage.setItem('chat_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  };

  // Register user with server
  const registerUserWithServer = useCallback((socket: Socket, user: User) => {
    logDebug('Registering user with server', { 
      username: user.username, 
      socketId: socket.id, 
      socketConnected: socket.connected,
      userIdentity: user.identity
    });
    
    if (!socket.connected) {
      console.warn('Socket not connected when attempting to register user');
      return;
    }
    
    // Add specific error handler for registration
    const registrationErrorHandler = (error: string) => {
      logDebug('Registration error:', error);
      
      if (error === 'Not registered' || error.includes('register')) {
        // If we get a registration error, try registering again after a short delay
        setTimeout(() => {
          if (socket.connected) {
            logDebug('Retrying registration after error');
            socket.emit('register_user', { 
              identity: user.identity,
              username: user.username,
              color: user.color
            });
          }
        }, 1000);
      }
    };
    
    // Listen for error events specifically for registration issues
    socket.once('error', registrationErrorHandler);
    
    // Remove the error handler after 5 seconds
          setTimeout(() => {
      socket.off('error', registrationErrorHandler);
    }, 5000);
    
    socket.emit('register_user', { 
      identity: user.identity,
      username: user.username,
      color: user.color
    });
    
    // Verify registration after a delay
    setTimeout(() => {
      if (socket.connected) {
        logDebug('Checking registration status');
        socket.emit('ping');
      } else {
        logDebug('Socket disconnected after registration attempt');
      }
    }, 1000);
  }, []);

  // Helper function to clear stored session data
  const clearSessionData = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('identity');
    sessionStorage.removeItem('pageLoadTimestamp');
  };

  // Update the beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      logDebug('Page is being unloaded (refresh/close)');
      // Set a flag in sessionStorage to indicate intentional disconnect
      sessionStorage.setItem('intentionalDisconnect', 'true');
      // Clear all session data
      clearSessionData();
    };

    // Handle visibility change (tab close/switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logDebug('Page visibility changed to hidden');
        // Only set the timestamp, don't clear data yet as the page might become visible again
        sessionStorage.setItem('lastVisibilityChange', Date.now().toString());
      }
    };

    // Handle actual page unload/close
    const handleUnload = () => {
      logDebug('Page is being closed');
      clearSessionData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('unload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  // Update the socket connection handler
  useEffect(() => {
    logDebug('Initializing socket connection');
    
    // Use standard Socket.IO options, relying on the library's built-in reconnection
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Set up connection listeners
    newSocket.on('connect', () => {
      logDebug('Socket CONNECTED', { id: newSocket.id });
      setIsConnected(true);
      
      // Check if this is a page reload/close (intentional disconnect)
      const wasIntentionalDisconnect = sessionStorage.getItem('intentionalDisconnect') === 'true';
      
      if (wasIntentionalDisconnect) {
        logDebug('This appears to be a page reload - clearing session');
        clearSessionData();
        sessionStorage.removeItem('intentionalDisconnect');
        return;
      }

      // Try to restore existing user session
      const storedUser = getStoredUser();
      const storedIdentity = getStoredIdentity();
      
      if (storedUser && storedIdentity) {
        logDebug('Found existing user session - attempting to restore', { 
          username: storedUser.username
        });
        
        const updatedUser = {
          ...storedUser,
          id: newSocket.id
        };
        
        saveUser(updatedUser);
        registerUserWithServer(newSocket, updatedUser);
        setCurrentUser(updatedUser);
      }
    });

    // Simplified disconnect handler
    newSocket.on('disconnect', (reason) => {
      logDebug('Socket DISCONNECTED', { reason });
      setIsConnected(false);
      
      // Only clear session data for intentional client disconnects
      if (reason === 'io client disconnect' || sessionStorage.getItem('intentionalDisconnect') === 'true') {
        logDebug('Clearing session data due to intentional disconnect');
        clearSessionData();
      }
      
      // Add user-friendly message
      if (reason === 'io server disconnect') {
        toast.error('Disconnected by server. Will attempt to reconnect...');
      } else if (['transport close', 'transport error', 'ping timeout'].includes(reason)) {
        toast.error('Connection lost. Attempting to reconnect...');
      }
    });

    // Connect and cleanup
    newSocket.connect();
    setSocket(newSocket);

    return () => {
      logDebug('Socket cleanup on component unmount');
      newSocket.removeAllListeners();
      newSocket.close();
    };
  }, []);

  // Validate message
  const validateMessage = (content: string): boolean => {
    logDebug('Validating message', { 
      content, 
      length: content?.length, 
      type: typeof content,
      trimmedLength: content?.trim()?.length
    });
    
    if (!content || typeof content !== 'string') {
      logDebug('Message validation failed: content is empty or not a string');
      return false;
    }
    
    if (content.length > 1000) {
      logDebug('Message validation failed: content too long', content.length);
      return false;
    }
    
    if (content.trim().length === 0) {
      logDebug('Message validation failed: content is only whitespace');
      return false;
    }
    
    logDebug('Message validation passed');
    return true;
  };

  // Extract mentions from message content
  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map(match => match.substring(1)); // Remove the @ symbol
  };

  // Create user
  const createUser = useCallback(() => {
    logDebug('createUser called');
    
    if (!socket || !isConnected) {
      toast.error('Waiting for server connection...');
      return;
    }

    // Clear any existing session data before creating new user
    clearSessionData();

    // Generate new user data
    const identity = `identity_${Math.random().toString(36).substr(2, 9)}`;
    const username = `user_${Math.random().toString(36).substr(2, 6)}`;
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    const user: User = {
      id: socket.id,
      username,
      color,
      identity
    };

    // Save new user information
    saveIdentity(identity);
    saveUser(user);
    
    // Register with server
    registerUserWithServer(socket, user);
    setCurrentUser(user);
    
    logDebug('New user created:', user);
    toast.success(`Welcome, ${username}!`);
  }, [socket, isConnected]);

  // Update mute check interval to use refs and avoid render updates
  useEffect(() => {
    const updateMuteStatus = () => {
      if (muteInfoRef.current) {
        const now = Date.now();
        if (now >= muteInfoRef.current.muteUntil) {
          muteInfoRef.current = null;
          setMuteInfo(null);
          setIsMuted(false);
          setMuteTimeRemaining(0);
        } else {
          setMuteTimeRemaining(Math.ceil((muteInfoRef.current.muteUntil - now) / 1000));
        }
      }
    };

    // Clear existing interval if any
    if (updateTimeoutRef.current) {
      clearInterval(updateTimeoutRef.current);
    }

    // Set up new interval only if there's active mute info
    if (muteInfo) {
      muteInfoRef.current = muteInfo;
      updateMuteStatus(); // Initial update
      updateTimeoutRef.current = setInterval(updateMuteStatus, 1000);
    } else {
      muteInfoRef.current = null;
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearInterval(updateTimeoutRef.current);
      }
    };
  }, [muteInfo]);

  // Update mute event listener
  useEffect(() => {
    if (!socket) return;

    socket.on('user_muted', ({ duration, muteUntil, username }) => {
      // Set all mute states immediately
      const now = Date.now();
      const remainingTime = Math.ceil((muteUntil - now) / 1000);

      // Update all states synchronously
      setMuteInfo({ duration, muteUntil });
      setIsMuted(true);
      setMuteTimeRemaining(remainingTime);
      muteInfoRef.current = { duration, muteUntil };
    });

    socket.on('user_unmuted', (data) => {
      if (currentUser && data.username === currentUser.username) {
        // Clear all mute states immediately
        muteInfoRef.current = null;
        setMuteInfo(null);
        setIsMuted(false);
        setMuteTimeRemaining(0);
      }
    });

    // Also check mute status on initial connection
    if (currentUser) {
      socket.emit('check_mute_status', { username: currentUser.username });
    }

    return () => {
      socket.off('user_muted');
      socket.off('user_unmuted');
    };
  }, [socket, currentUser]);

  // Add initial mute check when component mounts
  useEffect(() => {
    if (socket && currentUser) {
      socket.emit('check_mute_status', { username: currentUser.username });
    }
  }, [socket, currentUser]);

  // Send message
  const sendMessage = useCallback((content: string, replyTo?: ChatMessage): boolean => {
    logDebug('sendMessage called', { 
      content, 
      hasCurrentUser: !!currentUser, 
      hasSocket: !!socket,
      socketConnected: socket?.connected,
      isMuted: !!muteInfo && Date.now() < muteInfo.muteUntil,
      cooldown: MESSAGE_COOLDOWN - (Date.now() - lastMessageTime)
    });
    
    if (!socket || !currentUser) {
      logDebug('Cannot send message: no socket or user');
      return false;
    }
    
    if (muteInfo && Date.now() < muteInfo.muteUntil) {
      logDebug('Cannot send message: user is muted');
      return false;
    }
    
    if (!validateMessage(content)) {
      logDebug('Cannot send message: validation failed');
      return false;
    }

    const now = Date.now();
    const timeLeft = MESSAGE_COOLDOWN - (now - lastMessageTime);
    if (timeLeft > 0) {
      logDebug('Cannot send message: cooldown active, time left:', timeLeft);
      return false;
    }
    setLastMessageTime(now);

    logDebug('Emitting chat_message event', {
      content,
      senderId: currentUser.id,
      senderUsername: currentUser.username
    });

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
  }, [socket, currentUser, lastMessageTime, muteInfo, validateMessage]);

  // Room Functions
  const createRoom = useCallback(async (name: string, theme: RoomTheme): Promise<Room> => {
    if (!socket || !currentUser) {
      throw new Error('Not connected to server or not logged in');
    }
    
    return new Promise((resolve, reject) => {
      // Generate a unique room ID and room code
      const roomId = uuidv4();
      const roomCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      
      // Create the room object
      const room: Room = {
        id: roomId,
        name,
        adminId: currentUser.id,
        theme,
        createdAt: new Date(),
        code: roomCode,
        members: [currentUser.id],
        settings: {}
      };
      
      // Register room in the global registry
      roomRegistry.set(roomCode, room);
      roomRegistry.set(roomId, room); // Also store by ID for easier lookup
      
      console.log(`Creating room with name "${name}", code ${roomCode}, ID ${roomId}`);
      
      // Join the room on the server
      socket.emit('join', roomId);
      
      // Send room metadata to the server to broadcast to others
      socket.emit('room:metadata', {
        roomId,
        roomCode,
        name,
        theme,
        adminId: currentUser.id
      });
      
      // Listen for confirmation
      const handleRoomJoined = ({ success, roomId: joinedRoomId }: { success: boolean, roomId: string }) => {
        if (success && joinedRoomId === roomId) {
          setCurrentRoom(room);
          setRoomMessages([]);
          
          // Add system message about successful creation  
          const systemMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            username: 'SYSTEM',
            content: `Room "${name}" created successfully. Room code: ${roomCode}`,
            timestamp: new Date(),
            userColor: '#39ff14',
            roomId: roomId,
            isSystem: true,
            type: 'system'
          };
          
          setRoomMessages(prev => [...prev, systemMessage].slice(-MAX_MESSAGES));
          
          resolve(room);
          socket.off('room:joined:confirm', handleRoomJoined);
        }
      };
      
      socket.on('room:joined:confirm', handleRoomJoined);
      
      // Set a timeout to handle no response
      setTimeout(() => {
        socket.off('room:joined:confirm', handleRoomJoined);
        reject(new Error('Timeout joining room'));
      }, 5000);
    });
  }, [socket, currentUser]);
  
  const joinRoom = useCallback(async (code: string): Promise<boolean> => {
    if (!socket || !currentUser) {
      toast.error('Not connected to server or not logged in');
      return false;
    }
    
    // Validate code format
    if (!code || code.length < 5) {
      toast.error('Invalid room code - must be at least 5 characters');
      return false;
    }
    
    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase();
    
    return new Promise((resolve) => {
      // Check if we already have this room's metadata
      const existingRoom = roomRegistry.get(normalizedCode);
      
      let roomToJoin: Room;
      
      if (existingRoom) {
        // Use existing room data
        roomToJoin = existingRoom;
        console.log(`Using cached room data for room ${existingRoom.name} (${normalizedCode})`);
      } else {
        // Create a temporary room with deterministic ID based on code
        roomToJoin = {
          id: `room_${normalizedCode.toLowerCase()}`,
          name: `Room ${normalizedCode}`, // Generic name will be updated if metadata is found
          adminId: '',
          theme: 'terminal',
          createdAt: new Date(),
          code: normalizedCode,
          members: [],
          settings: {}
        };
        
        // Store in registry
        roomRegistry.set(normalizedCode, roomToJoin);
        roomRegistry.set(roomToJoin.id, roomToJoin);
      }
      
      // Create a flag to track if we've received metadata
      let metadataReceived = false;
      let joinSuccess = false;
      
      // Set up handler for metadata updates
      const handleMetadataUpdate = (metadata: any) => {
        if (metadata.roomId === roomToJoin.id || metadata.roomCode === normalizedCode) {
          console.log(`Received metadata for room ${metadata.name} (${metadata.roomCode})`);
          metadataReceived = true;
          
          // Update our room registry with received data
          const updatedRoom = {
            ...roomToJoin,
            name: metadata.name || roomToJoin.name,
            theme: metadata.theme || roomToJoin.theme,
            adminId: metadata.adminId || roomToJoin.adminId,
            id: metadata.roomId || roomToJoin.id,
            code: metadata.roomCode || roomToJoin.code,
            members: metadata.members || roomToJoin.members,
            settings: metadata.settings || roomToJoin.settings
          };
          
          // Update registry
          roomRegistry.set(normalizedCode, updatedRoom);
          roomRegistry.set(updatedRoom.id, updatedRoom);
          roomToJoin = updatedRoom;
          
          // If we've already received join confirmation, update the room
          if (joinSuccess) {
            finishJoining();
          }
        }
      };
      
      // Set up error handler
      const handleError = (error: any) => {
        if (typeof error === 'string' && error.includes(`No room found with code: ${normalizedCode}`)) {
          console.error(`Room not found: ${normalizedCode}`);
          cleanupListeners();
          resolve(false);
        }
      };
      
      // Function to clean up all listeners
      const cleanupListeners = () => {
        if (socket) {
          socket.off('room:metadata_update', handleMetadataUpdate);
          socket.off('error', handleError);
          socket.off('room:joined:confirm', handleRoomJoined);
        }
      };
      
      // Function to finalize room joining
      const finishJoining = () => {
        setCurrentRoom(roomToJoin);
        setRoomMessages([]);
        
        // Add system message about joining
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          username: 'SYSTEM',
          content: `Joined room "${roomToJoin.name}"`,
          timestamp: new Date(),
          userColor: '#39ff14',
          roomId: roomToJoin.id,
          isSystem: true,
          type: 'system'
        };
        
        setRoomMessages(prev => [...prev, systemMessage].slice(-MAX_MESSAGES));
        cleanupListeners();
        resolve(true);
      };
      
      // Listen for metadata updates
      socket.on('room:metadata_update', handleMetadataUpdate);
      
      // Listen for errors
      socket.on('error', handleError);
      
      // Join the room on the server
      socket.emit('join', roomToJoin.id);
      
      // Request room metadata
      socket.emit('room:request_metadata', { roomCode: normalizedCode });
      
      // Listen for confirmation
      const handleRoomJoined = ({ success, roomId }: { success: boolean, roomId: string }) => {
        if (success && roomId === roomToJoin.id) {
          joinSuccess = true;
          console.log(`Successfully joined room with ID ${roomId}`);
          
          // If we already have metadata or it's our own created room, finish joining immediately
          if (metadataReceived || existingRoom) {
            finishJoining();
          } else {
            // Otherwise, wait a short time for metadata
            setTimeout(() => {
              if (!metadataReceived) {
                console.warn(`No metadata received for room ${normalizedCode}, using default values`);
              }
              finishJoining();
            }, 300);
          }
        } else {
          console.error(`Failed to join room with ID ${roomId}, our ID was ${roomToJoin.id}`);
          cleanupListeners();
          resolve(false);
        }
        
        // This event only happens once, so we can always remove it
        if (socket) {
          socket.off('room:joined:confirm', handleRoomJoined);
        }
      };
      
      socket.on('room:joined:confirm', handleRoomJoined);
      
      // Set a timeout to handle no response
      setTimeout(() => {
        // If we received join confirmation but are still waiting, force completion
        if (joinSuccess && !metadataReceived) {
          console.warn('Room join succeeded but metadata timed out. Using default values.');
          finishJoining();
          return;
        }
        
        // If we're still waiting for join confirmation after 5 seconds, it failed
        if (!joinSuccess) {
          cleanupListeners();
          toast.error('Timeout joining room - server not responding');
          resolve(false);
        }
      }, 5000);
    });
  }, [socket, currentUser]);
  
  // Handle room metadata updates
  useEffect(() => {
    if (!socket) return;

    // Listen for room metadata updates
    socket.on('room:metadata_update', ({ roomId, roomCode, name, theme, adminId }) => {
      const room = Array.from(roomRegistry.values()).find(r => r.id === roomId);
      
      if (room) {
        // Update room metadata
        room.name = name;
        room.theme = theme;
        room.adminId = adminId;
        
        // Update registry with code if not already set
        if (roomCode && roomCode !== room.code) {
          roomRegistry.set(roomCode, room);
          room.code = roomCode;
        }
        
        // Update current room if needed
        if (currentRoom && currentRoom.id === roomId) {
          setCurrentRoom({ ...room });
          
          // Add system message about room name
          addSystemRoomMessage(`Room name is "${name}"`);
        }
      }
    });
    
    return () => {
      socket.off('room:metadata_update');
    };
  }, [socket, currentRoom, addNotification]);
  
  const leaveRoom = useCallback(() => {
    if (!socket || !currentRoom) return;
    
    // Leave the room on the server
    socket.emit('leave', currentRoom.id);
    
    // Clear local room state
    setCurrentRoom(null);
    setRoomMessages([]);
    toast.info(`Left room "${currentRoom.name}"`);
  }, [socket, currentRoom]);

  const sendRoomMessage = useCallback(
    (content: string, replyTo?: ChatMessage): boolean => {
      console.log('[DEBUG] sendRoomMessage called with:', { content, currentUser: !!currentUser, currentRoom: !!currentRoom, socket: !!socket });
      if (!socket || !currentUser || !currentRoom) return false;
      if (!validateMessage(content)) {
        console.log('[DEBUG] Room message validation failed');
        return false;
      }

      // Extract mentions
      const mentions = extractMentions(content);

      // Generate a unique message ID
      const messageId = uuidv4();
      
      console.log('[DEBUG] Emitting room_message event:', {
        id: messageId,
        roomId: currentRoom.id,
        content,
        mentions
      });
      
      // Don't add message locally, the server will broadcast it back to everyone
      // including the sender via the room_message_broadcast event
      socket.emit('room_message', {
        id: messageId,
        roomId: currentRoom.id,
        content,
        mentions,
        replyTo: replyTo ? {
          id: replyTo.id,
          username: replyTo.username,
          content: replyTo.content
        } : undefined
      });

      return true;
    },
    [socket, currentUser, currentRoom, validateMessage, extractMentions]
  );

  // Add a system message to room chat
  const addSystemRoomMessage = useCallback((content: string) => {
    if (!currentRoom) return;
    
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      username: 'SYSTEM',
      content,
      timestamp: new Date(),
      userColor: '#39ff14',
      roomId: currentRoom.id,
      isSystem: true,
      type: 'system'
    };
    
    setRoomMessages(prev => [...prev, systemMessage].slice(-MAX_MESSAGES));
  }, [currentRoom]);

  // Simplify the event listeners to focus on application logic rather than connection management
  useEffect(() => {
    if (!socket) return;

    logDebug('Setting up socket event listeners');

    // Listen for online count updates
    socket.on('online_count', (data: { count: number }) => {
      setOnlineUsers(data.count);
    });

    // Listen for user joined events
    socket.on('user_joined', (data: { id: string; username: string; onlineCount: number }) => {
      logDebug('User joined:', data);
      setOnlineUsers(data.onlineCount);
    });

    // Listen for user left events
    socket.on('user_left', (data: { id: string; username: string; onlineCount: number }) => {
      logDebug('User left:', data);
      setOnlineUsers(data.onlineCount);
    });

    // Listen for global chat messages
    socket.on('chat_message', (data) => {
      const newMessage: ChatMessage = {
        id: data.id || `${data.senderId}-${data.timestamp}`,
        username: data.senderUsername || 'SYSTEM',
        content: data.content,
        timestamp: new Date(data.timestamp),
        userColor: data.userColor || '#39ff14',
        roomId: 'global',
        replyTo: data.replyTo,
        mentions: data.mentions,
        isSystem: data.isSystem || data.type === 'system',
        type: data.type
      };
      
      setMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGES));
    });

    // Listen for room messages
    socket.on('room_message_broadcast', (data) => {
      if (currentRoom && data.roomId === currentRoom.id) {
        const newMessage: ChatMessage = {
          id: data.id || `room-${data.timestamp}`,
          username: data.username || 'SYSTEM',
          content: data.content,
          timestamp: new Date(data.timestamp || Date.now()),
          userColor: data.userColor || '#39ff14',
          roomId: data.roomId,
          replyTo: data.replyTo,
          mentions: data.mentions,
          isSystem: data.isSystem || data.type === 'system',
          type: data.type
        };
        
        const isDuplicate = roomMessages.some(msg => msg.id === newMessage.id);
        
        if (!isDuplicate) {
          setRoomMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGES));
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for leaderboard updates
    socket.on('leaderboard:data', (data: { users: UserMessageStats[] }) => {
      setLeaderboard(data.users);
    });

    // Request initial leaderboard data
    socket.emit('leaderboard:request');

    // Check connection every 30 seconds (just for debugging)
    const connectionCheckInterval = setInterval(() => {
      if (socket.connected) {
        logDebug('Connection health check - Connected');
      } else {
        logDebug('Connection health check - Disconnected');
      }
    }, 30000);

    return () => {
      clearInterval(connectionCheckInterval);
      socket.off('online_count');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('chat_message');
      socket.off('room_message_broadcast');
      socket.off('error');
      socket.off('leaderboard:data');
    };
  }, [socket, currentRoom]);

  // Add periodic leaderboard refresh
  useEffect(() => {
    if (!socket || !isConnected) return;

    const refreshInterval = setInterval(() => {
      socket.emit('leaderboard:request');
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [socket, isConnected]);

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

  const sendMessageReaction = useCallback(
    (messageId: string, reactionType: string, roomId?: string) => {
      if (!socket || !currentUser) return;

      const targetRoomId = roomId || 'global';
      
      // Find the message to get its author
      const targetMessage = targetRoomId === 'global' 
        ? messages.find(msg => msg.id === messageId)
        : roomMessages.find(msg => msg.id === messageId);

      if (!targetMessage) {
        console.error('Message not found for reaction:', messageId);
        return;
      }
      
      // Emit reaction to server with message author's username
      socket.emit('message_reaction', {
        messageId,
        reactionType,
        username: currentUser.username,
        messageAuthorUsername: targetMessage.username,
        roomId: targetRoomId
      });
      
      // Update local state immediately
      if (targetRoomId === 'global') {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || {};
              const existingReactions = reactions[reactionType] || [];
              
              // Only add if not already present
              if (!existingReactions.includes(currentUser.username)) {
                return {
                  ...msg,
                  reactions: {
                    ...reactions,
                    [reactionType]: [...existingReactions, currentUser.username]
                  }
                };
              }
            }
            return msg;
          });
        });
      } else {
        setRoomMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || {};
              const existingReactions = reactions[reactionType] || [];
              
              // Only add if not already present
              if (!existingReactions.includes(currentUser.username)) {
                return {
                  ...msg,
                  reactions: {
                    ...reactions,
                    [reactionType]: [...existingReactions, currentUser.username]
                  }
                };
              }
            }
            return msg;
          });
        });
      }
    },
    [socket, currentUser, messages, roomMessages]
  );

  // Set up socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle message reactions
    socket.on('message_reaction_broadcast', (data: {
      messageId: string;
      reactionType: string;
      username: string;
      roomId: string;
    }) => {
      const { messageId, reactionType, username, roomId } = data;
      
      if (roomId === 'global') {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || {};
              const existingReactions = reactions[reactionType] || [];
              
              if (!existingReactions.includes(username)) {
                return {
                  ...msg,
                  reactions: {
                    ...reactions,
                    [reactionType]: [...existingReactions, username]
                  }
                };
              }
            }
            return msg;
          });
        });
      } else {
        setRoomMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || {};
              const existingReactions = reactions[reactionType] || [];
              
              if (!existingReactions.includes(username)) {
                return {
                  ...msg,
                  reactions: {
                    ...reactions,
                    [reactionType]: [...existingReactions, username]
                  }
                };
              }
            }
            return msg;
          });
        });
      }
    });

    // Add listener for hack access updates
    socket.on('hack_access_update', (data: {
      hasAccess: boolean;
      accessInfo: {
        type: string;
        usageCount: number;
        maxUsages: number | null;
      } | null;
    }) => {
      setHasHackAccess(data.hasAccess);
      setHackAccessInfo(data.accessInfo);
      
      // Show notification about hack access
      if (data.hasAccess) {
        toast.success(data.accessInfo?.type === 'free' 
          ? '🎯 You have been granted unlimited hack access!'
          : `🎯 You have been granted hack access! (${data.accessInfo?.maxUsages} uses)`
        );
      }
    });

    return () => {
      socket.off('message_reaction_broadcast');
      socket.off('hack_access_update');
    };
  }, [socket, addNotification]);

  // Update the hack access check effect to use polling every 3 seconds
  useEffect(() => {
    // Initial check when user is set
    if (currentUser) {
      checkHackAccess();
    } else {
      setHasHackAccess(false);
      setHackAccessInfo(null);
    }
    
    // Set up polling interval
    const hackAccessPollInterval = setInterval(() => {
      if (currentUser && socket?.connected) {
        logDebug('Polling hack access status');
        checkHackAccess();
      }
    }, 3000); // Check every 3 seconds
    
    // Helper function to check hack access
    function checkHackAccess() {
      socket?.emit('check_hack_access', { userId: currentUser.id }, (response: { 
        hasAccess: boolean;
        accessInfo: {
          type: string;
          usageCount: number;
          maxUsages: number | null;
        } | null;
      }) => {
        logDebug('Hack access poll response:', response);
        
        // Only show notification if hack access changes from false to true
        if (response.hasAccess && !hasHackAccess) {
          toast.success(response.accessInfo?.type === 'free' 
            ? '🎯 You have been granted unlimited hack access!'
            : `🎯 You have been granted hack access! (${response.accessInfo?.maxUsages} uses)`
          );
        }
        
        setHasHackAccess(response.hasAccess);
        setHackAccessInfo(response.accessInfo);
      });
    }
    
    // Clean up interval
    return () => clearInterval(hackAccessPollInterval);
  }, [currentUser, socket, hasHackAccess]);

  const executeHack = useCallback(async (targetMode?: 'random' | 'specific', targetUsername?: string) => {
    logDebug('executeHack called', { 
      hasAccess: hasHackAccess, 
      targetMode, 
      targetUsername,
      hackInfo: hackAccessInfo
    });
    
    if (!socket || !currentUser || !hasHackAccess) {
      logDebug('Cannot execute hack - missing prerequisites', {
        socket: !!socket,
        currentUser: !!currentUser,
        hasHackAccess
      });
      return { success: false, stolenPoints: 0, victims: [], message: undefined };
    }

    return new Promise<{ 
        success: boolean;
        stolenPoints: number;
        victims: string[];
      message?: string;
    }>((resolve) => {
      logDebug('Sending execute_hack event');
      
      socket.emit('execute_hack', { 
        userId: currentUser.id,
        targetMode: targetMode || 'random',
        targetUsername
      });
      
      // Use a timeout to handle the case where the server doesn't respond
      const timeoutId = setTimeout(() => {
        toast.error('Hack request timed out. Please try again.');
        resolve({ success: false, stolenPoints: 0, victims: [], message: 'Request timed out' });
      }, 5000);
      
      // Set up a one-time listener for hack_result
      const handleHackResult = (response: { 
        success: boolean;
        stolenPoints: number;
        victims: string[];
        message?: string;
      }) => {
        clearTimeout(timeoutId);
        logDebug('Received hack response', response);
        
        if (response.success) {
          // Add system message about the hack
          const systemMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            username: 'SYSTEM',
            content: `🎯 ${currentUser.username} hacked ${response.victims.join(', ')} and stole ${response.stolenPoints} points!`,
            timestamp: new Date(),
            userColor: '#39ff14',
            roomId: currentRoom?.id || 'global',
            isSystem: true,
            type: 'system'
          };
          
          if (currentRoom) {
            setRoomMessages(prev => [...prev, systemMessage].slice(-MAX_MESSAGES));
          } else {
            setMessages(prev => [...prev, systemMessage].slice(-MAX_MESSAGES));
          }
          
          // Show success notification with the message from server if available
          toast.success(response.message || `Hack successful! Stole ${response.stolenPoints} points from ${response.victims.length} user(s)`);
          
          // Our polling will automatically update hack access status
        } else {
          // Show error notification
          toast.error('Hack failed. Try again later.');
        }
        
        resolve(response);
      };
      
      // Listen for the hack_result event
      socket.once('hack_result', handleHackResult);
      });
  }, [socket, currentUser, currentRoom, hasHackAccess, hackAccessInfo]);

  // Add listener for user points updates
  useEffect(() => {
    if (!socket) return;

    socket.on('user_points_update', (data: { points: number }) => {
      setCurrentUserPoints(data.points);
    });

    return () => {
      socket.off('user_points_update');
    };
  }, [socket]);

  // Add this new effect to monitor message state
  useEffect(() => {
    logDebug('Messages state changed:', { 
      count: messages.length, 
      latest: messages.length > 0 ? messages[messages.length - 1] : 'none' 
    });
  }, [messages]);

  useEffect(() => {
    logDebug('RoomMessages state changed:', { 
      count: roomMessages.length, 
      latest: roomMessages.length > 0 ? roomMessages[roomMessages.length - 1] : 'none'
    });
  }, [roomMessages]);

  const value: ChatContextType = {
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
    socket,
    currentUserPoints,
    
    // Room related functions and state
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    roomMessages,
    sendMessageReaction,
    extractMentions,
    leaderboard,
    globalStats,
    // Add hack-related properties
    hasHackAccess,
    hackAccessInfo,
    executeHack
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
