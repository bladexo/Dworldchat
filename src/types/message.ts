export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  replyTo?: {
    id: string;
    content: string;
  };
} 
