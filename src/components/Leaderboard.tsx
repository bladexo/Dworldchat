import React from 'react';
import { useChat } from '../context/ChatContext';
import { Trophy, MessageSquare, Heart } from 'lucide-react';
import UsernameBadge from './UsernameBadge';

interface LeaderboardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onOpenChange }) => {
  const { leaderboard } = useChat();

  // Get the top user's username for comparison
  const championUsername = leaderboard[0]?.username;

  return (
    <div className={`fixed right-4 top-20 w-80 bg-black/90 border border-neon-green/20 rounded-lg shadow-lg transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-neon-green flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-neon-green"
          >
            ×
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-hidden rounded-md border border-neon-green/20">
          <table className="w-full">
            <thead>
              <tr className="bg-black/50 border-b border-neon-green/20">
                <th className="text-left py-2 px-3 text-neon-green text-xs font-mono">#</th>
                <th className="text-left py-2 px-3 text-neon-green text-xs font-mono">User</th>
                <th className="text-right py-2 px-3 text-neon-green text-xs font-mono">Points</th>
                <th className="text-right py-2 px-3 text-neon-green text-xs font-mono">
                  <MessageSquare className="h-3 w-3 inline ml-1" />
                </th>
                <th className="text-right py-2 px-3 text-neon-green text-xs font-mono">
                  <Heart className="h-3 w-3 inline ml-1" />
                </th>
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
                  <td className="py-2 px-3 text-center">
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
                  <td className="py-2 px-3">
                    <UsernameBadge 
                      username={user.username} 
                      color={user.color}
                      showIcon={false}
                      isChampion={user.username === championUsername}
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-neon-green font-bold">
                    {user.points}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-neon-green/70 text-xs">
                    {user.messageCount}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-neon-green/70 text-xs">
                    {user.reactionCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 