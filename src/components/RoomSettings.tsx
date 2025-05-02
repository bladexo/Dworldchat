import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useChat, Room } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Shield, Users, Settings } from 'lucide-react';

interface RoomSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoomSettings: React.FC<RoomSettingsProps> = ({ isOpen, onOpenChange }) => {
  const { currentRoom, socket, currentUser, leaveRoom } = useChat();
  
  const [settings, setSettings] = useState({
    isPrivate: currentRoom?.settings?.isPrivate ?? false,
    maxUsers: currentRoom?.settings?.maxUsers ?? 20,
    allowGuests: currentRoom?.settings?.allowGuests ?? true,
  });

  const isAdmin = currentRoom?.adminId === currentUser?.id;

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    if (!socket || !currentRoom) return;
    
    socket.emit('room:update_settings', {
      roomId: currentRoom.id,
      settings
    });
    
    onOpenChange(false);
  };

  const closeRoom = () => {
    if (!socket || !currentRoom) return;
    
    // Confirmation dialog should be shown before this
    if (confirm('Are you sure you want to close this room? All users will be removed.')) {
      socket.emit('room:close', {
        roomId: currentRoom.id
      });
      leaveRoom();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-black border border-neon-green/30">
        <DialogHeader>
          <DialogTitle className="text-neon-green flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Room Settings
            {!isAdmin && <span className="text-yellow-400 text-xs">(View Only)</span>}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isAdmin 
              ? "Configure your room settings. Only you as the admin can change these."
              : "Room settings are controlled by the admin."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="isPrivate" className="text-neon-green">Private Room</Label>
                <span className="text-xs text-gray-400">Only invited users can join</span>
              </div>
              <Switch 
                id="isPrivate" 
                checked={settings.isPrivate}
                onCheckedChange={(checked) => handleSettingChange('isPrivate', checked)}
                disabled={!isAdmin}
                className="data-[state=checked]:bg-neon-green"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="maxUsers" className="text-neon-green">Max Users</Label>
              <span className="text-xs text-gray-400">Limit the number of users in the room</span>
            </div>
            <Input 
              id="maxUsers" 
              type="number" 
              min={2}
              max={100}
              value={settings.maxUsers}
              onChange={(e) => handleSettingChange('maxUsers', parseInt(e.target.value))}
              disabled={!isAdmin}
              className="border-neon-green/30 bg-black text-neon-green"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="allowGuests" className="text-neon-green">Allow Guests</Label>
                <span className="text-xs text-gray-400">Let users join without an account</span>
              </div>
              <Switch 
                id="allowGuests" 
                checked={settings.allowGuests}
                onCheckedChange={(checked) => handleSettingChange('allowGuests', checked)}
                disabled={!isAdmin}
                className="data-[state=checked]:bg-neon-green"
              />
            </div>
          </div>
        </div>
        
        <div className="border-t border-neon-green/20 pt-4">
          <h3 className="text-neon-green flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            Room Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Room ID</p>
              <p className="text-neon-green truncate">{currentRoom?.id}</p>
            </div>
            <div>
              <p className="text-gray-400">Created</p>
              <p className="text-neon-green">{currentRoom?.createdAt ? new Date(currentRoom.createdAt).toLocaleString() : 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-400">Members</p>
              <p className="text-neon-green">{currentRoom?.members?.length || 0}</p>
            </div>
            <div>
              <p className="text-gray-400">Room Code</p>
              <p className="text-neon-green">{currentRoom?.code}</p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {isAdmin && (
            <>
              <Button 
                variant="destructive" 
                onClick={closeRoom}
                className="bg-red-900 hover:bg-red-800 text-white border-none"
              >
                Close Room
              </Button>
              <Button 
                onClick={saveSettings}
                className="bg-black border border-neon-green text-neon-green hover:bg-neon-green/10"
              >
                Save Changes
              </Button>
            </>
          )}
          {!isAdmin && (
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-black border border-neon-green/50 text-neon-green hover:bg-neon-green/10"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomSettings; 