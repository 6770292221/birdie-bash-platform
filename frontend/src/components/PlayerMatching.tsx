import React, { useState } from 'react';
import { Users, Shuffle, Trophy, Target, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Player, Event } from '@/pages/Index';

interface PlayerMatchingProps {
  event: Event;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => void;
}

type SkillLevel = 'N' | 'S' | 'BG' | 'P';

interface EnhancedPlayer extends Player {
  skillLevel?: SkillLevel;
  matchPreference?: 'similar' | 'mixed' | 'challenging';
}

const skillIcons = {
  N: Target,      // Newbie (มือใหม่)
  S: Zap,         // Starter (มือเริ่มต้น) 
  BG: Trophy,     // Beginner (มือเริ่มต้น/มือหน้าบ้าน)
  P: Star         // Practicer (มือฝึกหัด)
};

const skillColors = {
  N: 'bg-yellow-100 text-yellow-700 border-yellow-300',    // Newbie - เหลือง
  S: 'bg-blue-100 text-blue-700 border-blue-300',         // Starter - น้ำเงิน
  BG: 'bg-green-100 text-green-700 border-green-300',     // Beginner - เขียว
  P: 'bg-red-100 text-red-700 border-red-300'             // Practicer - แดง
};

const skillLabels = {
  N: 'N (Newbie)',
  S: 'S (Starter)',
  BG: 'BG (Beginner)',
  P: 'P (Practicer)'
};

const PlayerMatching: React.FC<PlayerMatchingProps> = ({ event, onUpdateEvent }) => {
  const { t } = useLanguage();
  const [playerPairs, setPlayerPairs] = useState<EnhancedPlayer[][]>([]);
  const [isMatching, setIsMatching] = useState(false);

  // Add skill levels to players (mock data for demo)
  const enhancedPlayers: EnhancedPlayer[] = event.players
    .filter(p => p.status === 'registered')
    .map(player => ({
      ...player,
      skillLevel: ['N', 'S', 'BG', 'P'][Math.floor(Math.random() * 4)] as SkillLevel,
      matchPreference: ['similar', 'mixed', 'challenging'][Math.floor(Math.random() * 3)] as 'similar' | 'mixed' | 'challenging'
    }));

  // Skill level hierarchy for matching (higher number = more skilled)
  const skillRank = { N: 1, S: 2, BG: 3, P: 4 };

  const findBestMatch = (player: EnhancedPlayer, availablePlayers: EnhancedPlayer[]): EnhancedPlayer | null => {
    if (availablePlayers.length === 0) return null;

    const playerRank = skillRank[player.skillLevel!];
    
    // Find players with similar skill levels (±1 level difference preferred)
    const similarSkillPlayers = availablePlayers.filter(p => {
      const diff = Math.abs(skillRank[p.skillLevel!] - playerRank);
      return diff <= 1;
    });

    // If no similar skill players, find any available player
    const candidates = similarSkillPlayers.length > 0 ? similarSkillPlayers : availablePlayers;
    
    // Prefer players with overlapping playing times
    const overlappingPlayers = candidates.filter(p => {
      const playerStart = new Date(`2000-01-01T${player.startTime || '20:00'}`).getTime();
      const playerEnd = new Date(`2000-01-01T${player.endTime}`).getTime();
      const pStart = new Date(`2000-01-01T${p.startTime || '20:00'}`).getTime();
      const pEnd = new Date(`2000-01-01T${p.endTime}`).getTime();
      
      // Check if time ranges overlap
      return playerStart < pEnd && pStart < playerEnd;
    });

    const finalCandidates = overlappingPlayers.length > 0 ? overlappingPlayers : candidates;
    
    // Return random player from final candidates
    return finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  };

  const autoMatchPlayers = () => {
    setIsMatching(true);
    
    // Smart matching algorithm based on skill levels and playing time
    const availablePlayers = [...enhancedPlayers];
    const pairs: EnhancedPlayer[][] = [];
    
    while (availablePlayers.length > 0) {
      const player1 = availablePlayers.shift()!; // Take first available player
      const remainingPlayers = availablePlayers.filter(p => p.id !== player1.id);
      
      const bestMatch = findBestMatch(player1, remainingPlayers);
      
      if (bestMatch) {
        // Remove matched player from available list
        const index = availablePlayers.findIndex(p => p.id === bestMatch.id);
        if (index > -1) {
          availablePlayers.splice(index, 1);
        }
        pairs.push([player1, bestMatch]);
      } else {
        // No match found - check if we can add to existing pair (make it a triple)
        if (pairs.length > 0 && pairs[pairs.length - 1].length === 2) {
          pairs[pairs.length - 1].push(player1);
        } else {
          // Create single player pair
          pairs.push([player1]);
        }
      }
    }
    
    setTimeout(() => {
      setPlayerPairs(pairs);
      setIsMatching(false);
    }, 1500);
  };

  const reshuffleAll = () => {
    setPlayerPairs([]);
    autoMatchPlayers();
  };

  const getSkillBadge = (skillLevel: SkillLevel) => {
    const Icon = skillIcons[skillLevel];
    return (
      <Badge className={`${skillColors[skillLevel]} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {skillLabels[skillLevel]}
      </Badge>
    );
  };

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent font-bold">
          <Users className="w-5 h-5 mr-2" />
          {t('matching.title')}
        </CardTitle>
        <CardDescription>{t('matching.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Player Pool */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">ผู้เล่นที่ลงทะเบียน ({enhancedPlayers.length} คน)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {enhancedPlayers.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{player.name}</p>
                    <p className="text-xs text-gray-500">{player.startTime} - {player.endTime}</p>
                  </div>
                </div>
                {getSkillBadge(player.skillLevel!)}
              </div>
            ))}
          </div>
        </div>

        {/* Matching Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={autoMatchPlayers}
            disabled={isMatching || enhancedPlayers.length < 2}
            className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 hover:from-purple-700 hover:via-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium flex-1"
          >
            {isMatching ? (
              <>
                <Shuffle className="w-4 h-4 mr-2 animate-spin" />
                กำลังจับคู่...
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4 mr-2" />
                {t('matching.auto_match')}
              </>
            )}
          </Button>
          
          {playerPairs.length > 0 && (
            <Button
              onClick={reshuffleAll}
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              สับคู่ใหม่
            </Button>
          )}
        </div>

        {/* Matched Pairs */}
        {playerPairs.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">คู่ที่จับได้ ({playerPairs.length} คู่)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {playerPairs.map((pair, index) => (
                <Card key={index} className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-indigo-900">คู่ที่ {index + 1}</h4>
                      <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                        {pair.length} คน
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {pair.map(player => (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-white/70 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {player.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium">{player.name}</span>
                          </div>
                          {getSkillBadge(player.skillLevel!)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {enhancedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>ยังไม่มีผู้เล่นลงทะเบียน</p>
          </div>
        )}

        {enhancedPlayers.length === 1 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>ต้องมีผู้เล่นอย่างน้อย 2 คนเพื่อจับคู่</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerMatching;