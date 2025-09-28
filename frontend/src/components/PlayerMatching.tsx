import React, { useState, useEffect } from 'react';
import { Users, Play, Shuffle, X, Clock, MapPin, Trophy, Target, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Player, Event, Court } from '@/data/player';
import { apiClient } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

interface PlayerMatchingProps {
  event: Event;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => void;
}

interface MatchingGame {
  id: string;
  courtId: string;
  playerIds: Array<{
    id: string;
    name: string;
  }>;
  startTime: string;
  endTime?: string | null;
}

interface MatchingPlayer extends Player {
  runtime?: {
    playerId: string;
    state: 'Idle' | 'Waiting' | 'Playing';
    gamesPlayed: number;
    lastPlayedAt?: string | null;
    waitingSince?: string | null;
  };
}

interface MatchingStatusData {
  event?: {
    id: string;
    courts: Array<{
      id: string;
      currentGameId?: string | null;
    }>;
    games: MatchingGame[];
    players: MatchingPlayer[];
    queue: string[];
    createdAt: string;
  };
}

type SkillLevel = 'N' | 'S' | 'BG' | 'P';

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
  const { toast } = useToast();
  
  const [matchingStatus, setMatchingStatus] = useState<MatchingStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);

  // Get current timestamp in ISO format
  const getCurrentTimestamp = (): string => {
    return new Date().toISOString();
  };

  // Seed initial games - เริ่มเกมแรก
  const handleSeedMatching = async () => {
    setLoading(true);
    try {
      const response = await apiClient.seedMatching(event.id);
      
      if (response.success) {
        console.log('✅ Matching seeded:', response.data);
        toast({
          title: "เริ่มเกมแรกเรียบร้อย",
          description: `เวลาเริ่ม: ${new Date().toLocaleTimeString('th-TH')}`,
        });
        setGameStarted(true);
        await fetchMatchingStatus();
      } else {
        throw new Error(response.error || 'Seed failed');
      }
    } catch (error: any) {
      console.error('💥 Seed error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || 'ไม่สามารถเริ่มเกมได้',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get current matching status
  const fetchMatchingStatus = async () => {
    try {
      const response = await apiClient.getMatchingStatus(event.id);
      if (response.success) {
        setMatchingStatus(response.data);
        
        // Check if any game is started (has games but no currentGameId means finished)
        const hasActiveGames = response.data?.event?.courts?.some((court: any) => court.currentGameId) || false;
        const hasAnyGames = response.data?.event?.games?.length > 0 || false;
        setGameStarted(hasActiveGames || hasAnyGames);
      }
    } catch (error) {
      console.error('💥 Status fetch error:', error);
    }
  };

  // Advance to next games - Random ผู้เล่นใหม่
  const handleAdvanceMatching = async () => {
    if (!selectedCourtId) {
      toast({
        title: "กรุณาเลือกคอร์ท",
        description: "เลือกคอร์ทที่ต้องการ random ผู้เล่นใหม่",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const currentTime = getCurrentTimestamp();
      const response = await apiClient.advanceMatching(event.id, {
        courtId: selectedCourtId,
        at: currentTime
      });
      
      if (response.success) {
        console.log('✅ Advanced:', response.data);
        toast({
          title: "Random ผู้เล่นใหม่เรียบร้อย",
          description: `คอร์ท: ${getCourtName(selectedCourtId)} เวลา: ${new Date(currentTime).toLocaleTimeString('th-TH')}`,
        });
        await fetchMatchingStatus();
        setSelectedCourtId(''); // Reset selection
      } else {
        throw new Error(response.error || 'Advance failed');
      }
    } catch (error: any) {
      console.error('💥 Advance error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || 'ไม่สามารถ random ผู้เล่นได้',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Close matching - จบเกม
  const handleCloseMatching = async () => {
    setLoading(true);
    try {
      const currentTime = getCurrentTimestamp();
      const response = await apiClient.closeMatching(event.id);
      
      if (response.success) {
        console.log('✅ Matching closed:', response.data);
        toast({
          title: "จบเกมเรียบร้อย",
          description: `เวลาจบ: ${new Date(currentTime).toLocaleTimeString('th-TH')}`,
        });
        setGameStarted(false);
        await fetchMatchingStatus();
      } else {
        throw new Error(
          response.error || 'Close failed'
        );
      }
    } catch (error: any) {
      console.error('💥 Close error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || 'ไม่สามารถจบเกมได้',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get court name
  const getCourtName = (courtId: string): string => {
    const court = event.courts.find(c => c.id === courtId || c.courtNumber.toString() === courtId);
    return court?.name || `Court ${courtId}`;
  };

  // Get available courts 
  const getAvailableCourts = (): Court[] => {
    if (!matchingStatus?.event?.courts) return event.courts;
    
    return event.courts.filter(court => 
      matchingStatus.event!.courts.some(mc => 
        (mc.id === court.id || mc.id === court.courtNumber?.toString()) && mc.currentGameId
      )
    );
  };

  // Get skill badge for display
  const getSkillBadge = (skillLevel?: SkillLevel) => {
    if (!skillLevel) return null;
    const Icon = skillIcons[skillLevel];
    return (
      <Badge className={`${skillColors[skillLevel]} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {skillLabels[skillLevel]}
      </Badge>
    );
  };

  // Add random skill levels to players for demo
  const getRandomSkillLevel = (): SkillLevel => {
    const skills: SkillLevel[] = ['N', 'S', 'BG', 'P'];
    return skills[Math.floor(Math.random() * skills.length)];
  };

  useEffect(() => {
    fetchMatchingStatus();
    const interval = setInterval(fetchMatchingStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [event.id]);

  const registeredPlayers: MatchingPlayer[] = matchingStatus?.event?.players?.filter(p => p.registrationStatus === 'registered') ||
                           event.players
                             .filter(p => p.status === 'registered')
                             .map(p => p as MatchingPlayer);
  const availableCourts = getAvailableCourts();
  const activeGames = matchingStatus?.event?.games?.filter(g => !g.endTime) || [];
  const completedGames = matchingStatus?.event?.games?.filter(g => g.endTime) || [];

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent font-bold">
          <Users className="w-5 h-5 mr-2" />
          การจับคู่ผู้เล่น
        </CardTitle>
        <CardDescription>
          จัดการการแข่งขันและจับคู่ผู้เล่นในแต่ละเกม
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Game Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">สถานะเกม:</span>
            </div>
            <Badge className={gameStarted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              {gameStarted ? '🟢 กำลังเล่น' : '⚪ ยังไม่เริ่ม'}
            </Badge>
          </div>
          
          {matchingStatus?.event && (
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ผู้เล่นทั้งหมด:</span>
                <span className="ml-2 font-medium">{matchingStatus.event.players.length} คน</span>
              </div>
              <div>
                <span className="text-gray-500">เกมที่กำลังเล่น:</span>
                <span className="ml-2 font-medium">{activeGames.length} เกม</span>
              </div>
              <div>
                <span className="text-gray-500">คิวรอ:</span>
                <span className="ml-2 font-medium">{matchingStatus.event.queue.length} คน</span>
              </div>
              <div>
                <span className="text-gray-500">เกมที่จบแล้ว:</span>
                <span className="ml-2 font-medium">{completedGames.length} เกม</span>
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="space-y-4">
          
          {/* Start Game Button */}
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleSeedMatching}
              disabled={loading || gameStarted}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium w-full"
            >
              {loading ? (
                <>
                  <Shuffle className="w-4 h-4 mr-2 animate-spin" />
                  กำลังเริ่มเกม...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  เริ่มเกมแรก
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              กดเพื่อเริ่มเกมแรกและจับคู่ผู้เล่นในคอร์ทที่มี
            </p>
          </div>

          {/* Random Players Section */}
          {gameStarted && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Shuffle className="w-4 h-4 mr-2" />
                Random ผู้เล่นใหม่
              </h4>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={selectedCourtId}
                  onValueChange={setSelectedCourtId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="เลือกคอร์ท..." />
                  </SelectTrigger>
                  <SelectContent>
                    {event.courts.map((court) => (
                      <SelectItem 
                        key={court.id || court.courtNumber} 
                        value={court.id || court.courtNumber.toString()}
                      >
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3" />
                          <span>{court.name || `คอร์ท ${court.courtNumber}`}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleAdvanceMatching}
                  disabled={loading || !selectedCourtId}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                >
                  {loading ? (
                    <>
                      <Shuffle className="w-4 h-4 mr-2 animate-spin" />
                      กำลัง Random...
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4 mr-2" />
                      Random ผู้เล่น
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                เลือกคอร์ทและกดเพื่อสุ่มผู้เล่นใหม่เข้าไปเล่น
              </p>
            </div>
          )}

          {/* End Game Button */}
          {gameStarted && (
            <div className="flex flex-col space-y-2 border-t pt-4">
              <Button
                onClick={handleCloseMatching}
                disabled={loading}
                variant="destructive"
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium w-full"
              >
                {loading ? (
                  <>
                    <X className="w-4 h-4 mr-2 animate-spin" />
                    กำลังจบเกม...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    จบเกม
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                กดเพื่อจบเกมทั้งหมดและบันทึกผลการแข่งขัน
              </p>
            </div>
          )}
        </div>

        {/* Players Display */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            ผู้เล่นที่ลงทะเบียน ({registeredPlayers.length} คน)
          </h3>
          
          {registeredPlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {registeredPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {player.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-gray-500">
                        เล่น: {player.runtime?.gamesPlayed || player.gamesPlayed || 0} เกม
                        {player.runtime?.state && (
                          <span className="ml-2 text-blue-600">({player.runtime.state})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {getSkillBadge(getRandomSkillLevel())}
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      ลงทะเบียนแล้ว
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>ยังไม่มีผู้เล่นลงทะเบียน</p>
            </div>
          )}
        </div>

        {/* Active Games Display */}
        {activeGames.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">เกมที่กำลังเล่น ({activeGames.length})</h3>
            <div className="space-y-2">
              {activeGames.map(game => (
                <div key={game.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-blue-900">
                        {getCourtName(game.courtId)}
                      </p>
                      <p className="text-xs text-blue-700">
                        ผู้เล่น: {game.playerIds.map(p => p.name).join(', ')}
                      </p>
                      <p className="text-xs text-blue-600">
                        เริ่ม: {new Date(game.startTime).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">
                      กำลังเล่น
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Games Display */}
        {completedGames.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">เกมที่จบแล้ว ({completedGames.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {completedGames.map(game => (
                <div key={game.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {getCourtName(game.courtId)}
                      </p>
                      <p className="text-xs text-gray-700">
                        ผู้เล่น: {game.playerIds.map(p => p.name).join(', ')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(game.startTime).toLocaleTimeString('th-TH')} - {' '}
                        {game.endTime && new Date(game.endTime).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                    <Badge className="bg-gray-100 text-gray-700">
                      จบแล้ว
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default PlayerMatching;