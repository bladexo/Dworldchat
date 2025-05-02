import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DoorOpen } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { toast } from 'sonner';

interface RoomJoinModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoomJoinModal: React.FC<RoomJoinModalProps> = ({ 
  isOpen, 
  onOpenChange 
}) => {
  const { joinRoom } = useChat();
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleJoinRoom = async () => {
    // Reset previous errors
    setJoinError('');
    
    if (!roomCode.trim()) {
      setJoinError('Please enter a room code');
      return;
    }

    // Validate room code format
    if (roomCode.trim().length < 5) {
      setJoinError('Room code must be at least 5 characters');
      return;
    }

    setIsJoining(true);
    
    try {
      const success = await joinRoom(roomCode);
      if (success) {
        // Don't show toast, the room joining already displays a system message
        onOpenChange(false);
      } else {
        setJoinError('Failed to join room. The room may not exist or the code is incorrect.');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const resetForm = () => {
    setRoomCode('');
    setJoinError('');
  };

  // Reset form when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-black border border-neon-green/30 text-neon-green">
        <DialogHeader>
          <DialogTitle className="text-neon-green font-mono">
            Join Private Room
          </DialogTitle>
          <DialogDescription className="text-neon-green/70 font-mono">
            Enter the room code to join a private room
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-code" className="text-right font-mono">
              Room Code
            </Label>
            <Input
              id="room-code"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="col-span-3 bg-black border-neon-green/30 text-neon-green placeholder:text-neon-green/50 uppercase"
              maxLength={8}
            />
          </div>
          
          {joinError && (
            <div className="text-red-500 text-sm font-mono mt-1 text-center">
              {joinError}
            </div>
          )}
          
          <div className="text-xs text-neon-green/60 font-mono text-center">
            Note: Room codes are case-insensitive and should be shared by the room creator.
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleJoinRoom}
            disabled={isJoining || !roomCode.trim()}
            className="w-full bg-transparent border border-neon-green text-neon-green hover:bg-neon-green/10"
          >
            {isJoining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <DoorOpen className="mr-2 h-4 w-4" />
            )}
            {isJoining ? 'Joining Room...' : 'Join Room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomJoinModal; 