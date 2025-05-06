import React from 'react';
import { useChat } from '../context/ChatContext';
import { Trophy } from 'lucide-react';
import UsernameBadge from './UsernameBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LeaderboardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onOpenChange }) => {
  const { leaderboard } = useChat();

  // Get the top user's username for comparison
  const championUsername = leaderboard[0]?.username;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/90 border border-neon-green/20 text-neon-green sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neon-green">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </DialogTitle>
        </DialogHeader>

        {/* Leaderboard Table */}
        <div className="overflow-hidden rounded-md border border-neon-green/20">
          <table className="w-full">
            <thead>
              <tr className="bg-black/50 border-b border-neon-green/20">
                <th className="text-left py-2 px-2 text-neon-green text-xs font-mono">#</th>
                <th className="text-left py-2 px-2 text-neon-green text-xs font-mono">User</th>
                <th className="text-right py-2 px-2 text-neon-green text-xs font-mono">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, index) => (
                <tr 
                  key={user.username} 
                  className={`border-b border-neon-green/10 ${
                    index === 0 ? 'bg-yellow-500/10' : 
                    index === 1 ? 'bg-gray-400/10' : 
                    index === 2 ? 'bg-amber-700/10' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-center">
                    {index === 0 ? (
                      <span className="text-yellow-400 font-bold">🥇</span>
                    ) : index === 1 ? (
                      <span className="text-gray-400 font-bold">🥈</span>
                    ) : index === 2 ? (
                      <span className="text-amber-700 font-bold">🥉</span>
                    ) : (
                      <span className="text-gray-500">{index + 1}</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <UsernameBadge 
                      username={user.username} 
                      color={user.color}
                      showIcon={false}
                      isChampion={user.username === championUsername}
                      className="scale-90"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-neon-green font-bold text-xs sm:text-sm">
                    {user.points}
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-neon-green/50 text-sm">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Leaderboard; 