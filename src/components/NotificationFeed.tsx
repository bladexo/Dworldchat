import React from 'react';
import { Terminal, UserPlus, UserMinus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Notification {
  id: string;
  type: 'join' | 'leave' | 'message';
  username: string;
  timestamp: number;
  message?: string;
}

interface NotificationFeedProps {
  notifications: Notification[];
}

const NotificationFeed: React.FC<NotificationFeedProps> = ({ notifications }) => {
  // Only show the last 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'join':
        return <UserPlus className="h-4 w-4 text-neon-green" />;
      case 'leave':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-neon-blue" />;
    }
  };

  const getMessage = (notification: Notification) => {
    if (notification.message) {
      return notification.message;
    }
    switch (notification.type) {
      case 'join':
        return `>> AGENT ${notification.username} CONNECTED TO SECURE CHANNEL`;
      case 'leave':
        return `>> AGENT ${notification.username} DISCONNECTED`;
      case 'message':
        return `>> INCOMING TRANSMISSION FROM ${notification.username}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 right-0 w-96 overflow-hidden bg-black/50 border border-neon-green/30 rounded-sm backdrop-blur-sm z-[100]"
    >
      <motion.div 
        className="p-2 bg-black/80 border-b border-neon-green/30 flex items-center gap-2"
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      >
        <Terminal className="h-4 w-4 text-neon-green" />
        <span className="text-xs font-mono text-neon-green">SYSTEM LOG</span>
      </motion.div>

      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {recentNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 50, height: 0 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                height: 'auto',
                transition: {
                  type: "spring",
                  stiffness: 100,
                  delay: index * 0.1
                }
              }}
              exit={{ 
                opacity: 0, 
                x: -50, 
                height: 0,
                transition: {
                  duration: 0.2,
                }
              }}
              className="relative group"
            >
              <motion.div
                className="absolute left-0 top-0 w-1 h-full bg-neon-green/30"
                whileHover={{ backgroundColor: 'rgba(0, 255, 0, 0.6)' }}
              />
              <motion.div
                className="p-3 text-sm font-mono border-b border-hacker-border/30 flex items-center gap-3"
                whileHover={{ 
                  backgroundColor: 'rgba(0, 255, 0, 0.05)',
                  textShadow: '0 0 8px rgba(0, 255, 0, 0.5)'
                }}
              >
                <motion.span
                  className="text-neon-green/70"
                  whileHover={{ scale: 1.1 }}
                >
                  {getIcon(notification.type)}
                </motion.span>
                
                <motion.span 
                  className="text-neon-green/90 flex-1"
                >
                  {getMessage(notification)}
                </motion.span>

                <motion.span 
                  className="text-xs text-neon-green/50"
                >
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </motion.span>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NotificationFeed; 