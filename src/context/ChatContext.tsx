import React, { createContext, useContext, useEffect, useState, useCallback, useRef, FC, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { generateUsername, generateUserColor } from '../utils/usernameGenerator';
import { toast } from 'sonner';
import { Notification } from '@/components/NotificationFeed';
import { debounce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

// Constants
const MAX_MESSAGES = 100; // Maximum number of messages to keep in history

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
  executeHack: () => Promise<{ success: boolean; stolenPoints: number; victims: string[] }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.PROD 
  ? 'https://nutty-annabell-loganrustyy-25293412.koyeb.app'
  : (import.meta.env.VITE_SERVER_URL || 'http://localhost:8000');

// Room storage - maps room codes to room data
// This is kept in memory to maintain room metadata across joins
const roomRegistry = new Map<string, Room>();

// Constants
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

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

  // Set hack access to true by default for everyone
  const [hasHackAccess, setHasHackAccess] = useState<boolean>(true);

  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);

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
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: false // Don't connect automatically
    });

    // Set up event handlers before connecting
    newSocket.on('connect', () => {
      console.log('Connected to server with socket ID:', newSocket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      
      // Re-register if we have an existing user
      if (currentUser) {
        console.log('Re-registering existing user after reconnection:', currentUser.username);
        // Update the user's ID to match the new socket
        const updatedUser = {
          ...currentUser,
          id: newSocket.id
        };
        setCurrentUser(updatedUser);
        
        // Re-register with the server
        newSocket.emit('register', {
          username: currentUser.username,
          color: currentUser.color,
          publicKey: 'dummy-key-' + Math.random().toString(36).substr(2, 9)
        });
        
        // Rejoin room if was in a room
        if (currentRoom) {
          console.log('Rejoining room after reconnection:', currentRoom.name);
          newSocket.emit('join', currentRoom.id);
        }
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server. Reason:', reason);
      setIsConnected(false);
      
      // If the disconnection wasn't intentional, try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        setIsReconnecting(true);
        
        // Implement exponential backoff for reconnection
        const attemptReconnect = () => {
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Max reconnection attempts reached');
            setIsReconnecting(false);
            toast.error('Could not reconnect to server. Please refresh the page.');
            return;
          }

          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff with 10s max
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            if (!newSocket.connected) {
              setReconnectAttempts(prev => prev + 1);
              newSocket.connect();
            }
          }, delay);
        };

        attemptReconnect();
      }
      
      toast.error('Disconnected from server. Attempting to reconnect...');
    });

    // Add ping/pong to keep connection alive
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 25000);

    newSocket.on('pong', () => {
      console.log('Received pong from server');
    });

    // Handle registration errors
    newSocket.on('error', (error) => {
      console.log('Socket error:', error);
      if (error === 'Not registered' && currentUser) {
        console.log('Attempting to re-register user after error:', currentUser.username);
        newSocket.emit('register', {
          username: currentUser.username,
          color: currentUser.color,
          publicKey: 'dummy-key-' + Math.random().toString(36).substr(2, 9)
        });
      }
    });

    // Initial connection attempt
    newSocket.connect();
    setSocket(newSocket);

    return () => {
      clearInterval(pingInterval);
      newSocket.close();
    };
  }, []); // Remove dependencies to prevent recreation of socket

  // Add recovery mechanism for when frontend starts before backend
  useEffect(() => {
    if (socket && !isConnected && currentUser && !isReconnecting) {
      const checkConnection = setInterval(() => {
        if (!socket.connected) {
          console.log('Checking connection status...');
          socket.connect();
        }
      }, 5000);

      return () => clearInterval(checkConnection);
    }
  }, [socket, isConnected, currentUser, isReconnecting]);

  const validateMessage = (content: string): boolean => {
    if (!content || typeof content !== 'string') return false;
    if (content.length > 1000) return false;
    if (content.trim().length === 0) return false;
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
    if (!socket || !isConnected) {
      toast.error('Waiting for server connection...');
      return;
    }

    const username = `user_${Math.random().toString(36).substr(2, 6)}`;
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    const publicKey = 'dummy-key-' + Math.random().toString(36).substr(2, 9);
    
    console.log('Creating new user:', { username, color });
    
    const user: User = {
      id: socket.id,
      username,
      color
    };

    socket.emit('register', {
      username: user.username,
      color: user.color,
      publicKey
    });
    
    setCurrentUser(user);
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

  const sendMessage = useCallback((content: string, replyTo?: ChatMessage): boolean => {
    if (!socket || !currentUser) return false;
    
    if (muteInfo && Date.now() < muteInfo.muteUntil) {
      return false;
    }
    
    if (!validateMessage(content)) {
      return false;
    }

    const now = Date.now();
    const timeLeft = MESSAGE_COOLDOWN - (now - lastMessageTime);
    if (timeLeft > 0) {
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
      if (!socket || !currentUser || !currentRoom) return false;
      if (!validateMessage(content)) return false;

      // Extract mentions
      const mentions = extractMentions(content);

      // Generate a unique message ID
      const messageId = uuidv4();
      
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
    [socket, currentUser, currentRoom, validateMessage]
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

  useEffect(() => {
    if (!socket) return;

    // Listen for global chat messages
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
        roomId: 'global',
        replyTo,
        mentions,
        isSystem: isSystem || type === 'system',
        type
      };
      
      console.log('Received message:', newMessage);
      setMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGES));
    });

    // Listen for room messages
    socket.on('room_message_broadcast', ({ 
      id,
      roomId,
      username,
      content,
      timestamp,
      userColor,
      replyTo,
      mentions,
      isSystem,
      type
    }) => {
      if (currentRoom && roomId === currentRoom.id) {
        // Create our message object
        const newMessage: ChatMessage = {
          id: id || `room-${timestamp}`,
          username: username || 'SYSTEM',
          content,
          timestamp: new Date(timestamp || Date.now()),
          userColor: userColor || '#39ff14',
          roomId,
          replyTo,
          mentions,
          isSystem: isSystem || type === 'system',
          type
        };
        
        // Check if this message is already in our list to avoid duplicates
        const isDuplicate = roomMessages.some(msg => msg.id === newMessage.id);
        
        if (!isDuplicate) {
          console.log('Received room message:', newMessage);
          setRoomMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGES));
          
          // Check if message contains mentions
          if (currentUser && newMessage.mentions?.includes(currentUser.username)) {
            toast.info(`@${newMessage.username} mentioned you in the room`);
          }
        } else {
          console.log('Duplicate message detected, not adding:', newMessage.id);
        }
      }
    });

    socket.on('mention', ({ username }) => {
      toast.info(`@${username} mentioned you`);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error);
    });

    // Listen for leaderboard updates
    socket.on('leaderboard:data', (data: { users: UserMessageStats[] }) => {
      console.log('Received leaderboard data:', data);
      setLeaderboard(data.users);
    });

    // Listen for global stats updates
    socket.on('global_stats', (stats) => {
      console.log('Received global stats:', stats);
      setGlobalStats(stats);
    });

    // Request initial leaderboard data
    socket.emit('leaderboard:request');

    return () => {
      socket.off('chat_message');
      socket.off('room_message_broadcast');
      socket.off('mention');
      socket.off('error');
      socket.off('leaderboard:data');
      socket.off('global_stats');
    };
  }, [socket, currentRoom, addNotification]);

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

    return () => {
      socket.off('message_reaction_broadcast');
    };
  }, [socket]);

  // Remove the hack access check effect since everyone has access now
  useEffect(() => {
    if (currentUser) {
      socket?.emit('check_hack_access', { userId: currentUser.id }, (response: { hasAccess: boolean }) => {
        setHasHackAccess(true); // Always set to true regardless of server response
      });
    }
  }, [currentUser, socket]);

  const executeHack = useCallback(async () => {
    if (!socket || !currentUser) {
      return { success: false, stolenPoints: 0, victims: [] };
    }

    return new Promise<{ success: boolean; stolenPoints: number; victims: string[] }>((resolve) => {
      socket.emit('execute_hack', { userId: currentUser.id }, (response: { 
        success: boolean;
        stolenPoints: number;
        victims: string[];
      }) => {
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
        }
        resolve(response);
      });
    });
  }, [socket, currentUser, currentRoom]);

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
