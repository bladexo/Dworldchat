import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Copy, Loader2, Plus, Terminal, Monitor, Laptop, Shield, Crown } from 'lucide-react';
import { useChat, Room, RoomTheme } from '@/context/ChatContext';
import { toast } from 'sonner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoomCreateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoomCreateModal: React.FC<RoomCreateModalProps> = ({ 
  isOpen, 
  onOpenChange 
}) => {
  const { createRoom } = useChat();

  // Form States
  const [roomName, setRoomName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<RoomTheme>('terminal');
  
  // Submission States
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);

  // Themes for selection
  const themes: { value: RoomTheme; label: string; icon: React.ReactNode }[] = [
    { 
      value: 'terminal', 
      label: 'Terminal', 
      icon: <Terminal className="h-4 w-4 text-neon-green" /> 
    },
    { 
      value: 'cyberpunk', 
      label: 'Cyberpunk', 
      icon: <Monitor className="h-4 w-4 text-pink-500" /> 
    },
    { 
      value: 'retro', 
      label: 'Retro', 
      icon: <Laptop className="h-4 w-4 text-amber-500" /> 
    },
    { 
      value: 'minimal', 
      label: 'Minimal', 
      icon: <Plus className="h-4 w-4 text-blue-500" /> 
    },
    { 
      value: 'hacker', 
      label: 'Hacker', 
      icon: <Shield className="h-4 w-4 text-green-500" /> 
    },
    { 
      value: 'premium', 
      label: '✨ Azure Elegance ✨', 
      icon: <Crown className="h-4 w-4 text-blue-500" /> 
    },
  ];

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsCreating(true);
    
    try {
      const room = await createRoom(roomName, selectedTheme);
      setCreatedRoom(room);
      toast.success(`Room "${roomName}" created successfully!`);
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdRoom) return;
    
    navigator.clipboard.writeText(createdRoom.code);
    setCopied(true);
    toast.success('Room code copied to clipboard');
    
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setRoomName('');
    setSelectedTheme('terminal');
    setCreatedRoom(null);
    setCopied(false);
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
            {createdRoom ? 'Room Created' : 'Create Private Room'}
          </DialogTitle>
          <DialogDescription className="text-neon-green/70 font-mono">
            {createdRoom 
              ? 'Share this code with others to join your room'
              : 'Create a private room for you and your friends'
            }
          </DialogDescription>
        </DialogHeader>

        {!createdRoom ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="room-name" className="text-right font-mono">
                Room Name
              </Label>
              <Input
                id="room-name"
                placeholder="Enter room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="col-span-3 bg-black border-neon-green/30 text-neon-green placeholder:text-neon-green/50"
                maxLength={30}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="theme" className="text-right font-mono">
                Theme
              </Label>
              <div className="col-span-3">
                <Select 
                  value={selectedTheme} 
                  onValueChange={(value) => setSelectedTheme(value as RoomTheme)}
                >
                  <SelectTrigger className="bg-black border-neon-green/30 text-neon-green">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border border-neon-green/30 text-neon-green">
                    {themes.map((theme) => (
                      <SelectItem 
                        key={theme.value} 
                        value={theme.value}
                        className={`hover:bg-neon-green/10 focus:bg-neon-green/10 ${
                          theme.value === 'premium' ? 'border-y border-yellow-500/40 bg-black' : ''
                        }`}
                      >
                        <div className={`flex items-center gap-2 ${
                          theme.value === 'premium' ? 'font-bold' : ''
                        }`}>
                          {theme.icon}
                          <span className={theme.value === 'premium' ? 'text-blue-500' : ''}>
                            {theme.label}
                          </span>
                          {theme.value === 'premium' && (
                            <span className="ml-1 text-[10px] bg-blue-500/20 text-blue-500 px-1 rounded">WHITE & BLUE</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="my-6 text-center">
            <div className="mb-4">
              <h3 className="text-lg font-mono text-neon-green mb-2">Room Code</h3>
              <div className="flex items-center justify-center gap-2 font-mono">
                <div className="text-2xl border border-neon-green/30 bg-black p-3 rounded tracking-widest">
                  {createdRoom.code}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopyCode}
                  className="border-neon-green/30 text-neon-green hover:bg-neon-green/10"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-neon-green/70">
              You've been automatically joined to this room
            </p>
          </div>
        )}

        <DialogFooter>
          {!createdRoom ? (
            <Button 
              onClick={handleCreateRoom}
              disabled={isCreating || !roomName.trim()}
              className="w-full bg-transparent border border-neon-green text-neon-green hover:bg-neon-green/10"
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Terminal className="mr-2 h-4 w-4" />
              )}
              {isCreating ? 'Creating Room...' : 'Create Room'}
            </Button>
          ) : (
            <Button 
              onClick={() => handleOpenChange(false)}
              className="w-full bg-transparent border border-neon-green text-neon-green hover:bg-neon-green/10"
            >
              Continue to Room
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomCreateModal; 