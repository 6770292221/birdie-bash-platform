import React, { useState, useEffect } from 'react';
import { Users, Play, Shuffle, X, Clock, MapPin, Trophy, Target, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Player, Event, Court } from '@/data/player';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';

interface PlayerMatchingProps {
  event: Event;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => void;
}

const PlayerMatching: React.FC<PlayerMatchingProps> = ({ event, onUpdateEvent }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
const [eventData, setEventData] = useState<any>(null); // เพิ่ม state สำหรับข้อมูล event

  // Load event data on component mount
  useEffect(() => {
    const loadEventData = async () => {
      try {
        const response = await apiClient.getEvent(event.id);
        if (response.success && response.data?.event) {
          setEventData(response.data.event);
          console.log('📅 Event data loaded:', response.data.event);
        }
      } catch (error) {
        console.error('Failed to load event data:', error);
      }
    };

    loadEventData();
  }, [event.id]);

  // Get current timestamp
  const getCurrentTimestamp = (): string => {
    return new Date().toISOString();
  };

  

  // Start initial games - เริ่มเกมแรก
  const handleSeedMatching = async () => {
    setLoading(true);
    try {
      const response = await apiClient.seedMatching(event.id);
      
      if (response.success) {
        console.log('✅ Matching seeded:', response.data);
        setMatchingStatus(response.data.event); // อัพเดทข้อมูล
        toast({
          title: gameStarted ? "เริ่มเกมใหม่เรียบร้อย" : "เริ่มเกมแรกเรียบร้อย",
          description: `เวลาเริ่ม: ${new Date().toLocaleTimeString('th-TH')}`,
        });
        setGameStarted(true);
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

  // Advance matching - Random ผู้เล่นใหม่ในคอร์ทที่เลือก
  const handleAdvanceMatching = async (courtId?: string) => {
    const targetCourtId = courtId || selectedCourtId;
    
    if (!targetCourtId) {
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
        courtId: targetCourtId,
        at: currentTime
      });
      
      if (response.success) {
        console.log('✅ Advanced:', response.data);
        setMatchingStatus(response.data.event); // อัพเดทข้อมูล
        const courtName = getCourtName(targetCourtId);
        toast({
          title: "Random ผู้เล่นใหม่เรียบร้อย",
          description: `คอร์ท: ${courtName} เวลา: ${new Date(currentTime).toLocaleTimeString('th-TH')}`,
        });
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
      const response = await apiClient.closeMatching(event.id);
      
      if (response.success) {
        console.log('✅ Matching closed:', response.data);
        toast({
          title: "จบเกมเรียบร้อย",
          description: `เวลาจบ: ${new Date().toLocaleTimeString('th-TH')}`,
        });
        // รีเซ็ตสถานะหลังจบเกม
        setGameStarted(false);
        setMatchingStatus(null);
      } else {
        throw new Error(response.error || 'Close failed');
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

  // Check if court is available based on time
  const isCourtAvailable = (court: Court): boolean => {
    if (!court.startTime || !court.endTime) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTimeParts = court.startTime.split(':');
    const endTimeParts = court.endTime.split(':');
    const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
    
    return currentTime >= startMinutes && currentTime <= endMinutes;
  };

  const normalizeCourtKey = (val: string | number | undefined | null) => {
  const s = String(val ?? '').toLowerCase();
  const m = s.match(/(\d+)/);
  return m ? m[1] : s;
};

// Helper function to get court name
const getCourtName = (courtId: string): string => {
  const key = normalizeCourtKey(courtId);
  const court = event.courts.find(c =>
    normalizeCourtKey((c as any).id ?? c.courtNumber) === key
  );
  // ชื่อเป็น "คอร์ท c<เลข>" ถ้าไม่มี name
  return (court as any)?.name || `คอร์ท c${key}`;
};

// Get courts with active games from matching status
const getCourtsWithGames = () => {
  if (!matchingStatus?.courts || !matchingStatus?.games) return [];

  return matchingStatus.courts
    .filter((court: any) => court.currentGameId)
    .map((court: any) => {
      const activeGame = matchingStatus.games.find(
        (game: any) => game.id === court.currentGameId && !game.endTime
      );

      // จับคู่ court "c1" กับ courtNumber 1
      const originalCourt = event.courts.find((c: Court) =>
        normalizeCourtKey((c as any).id ?? c.courtNumber) === normalizeCourtKey(court.id)
      );

      // ใช้เวลาใน event.courts ถ้ามี ไม่งั้นไม่กำหนด (เลี่ยง fallback 20:00/22:00)
      const startTime = (originalCourt as any)?.startTime ?? undefined;
      const endTime = (originalCourt as any)?.endTime ?? undefined;

      return {
        ...court,
        name: getCourtName(court.id),
        startTime,
        endTime,
        activeGame,
        players: activeGame?.playerIds || [],
        isAvailable: originalCourt ? isCourtAvailable(originalCourt) : true,
      };
    });
};

  // Get players by state from matching status
  const getPlayersByState = (state: string) => {
    if (!matchingStatus?.players) return [];
    return matchingStatus.players.filter((p: any) => p.runtime?.state === state);
  };

  // Check if there are any active games
  const hasActiveGames = () => {
    if (!matchingStatus?.games) return false;
    return matchingStatus.games.some((game: any) => !game.endTime);
  };

  // Get display data - ใช้ข้อมูลจาก matching status ถ้ามี ไม่งั้นใช้จาก event data
  const getDisplayData = () => {
    if (matchingStatus) {
      // ใช้ข้อมูลจาก matching status (หลังเริ่มเกมแล้ว)
      const courtsWithGames = getCourtsWithGames();
      const playingPlayers = getPlayersByState('Playing');
      const waitingPlayers = getPlayersByState('Waiting');
      const idlePlayers = getPlayersByState('Idle');
      
      return {
        activeCourts: courtsWithGames.length,
        playingCount: playingPlayers.length,
        waitingCount: waitingPlayers.length,
        idleCount: idlePlayers.length,
        totalPlayers: matchingStatus.players?.length || 0,
        courtsWithGames,
        playingPlayers,
        waitingPlayers,
        idlePlayers
      };
    } else {
      // ใช้ข้อมูลจาก event (ก่อนเริ่มเกม)
      const totalPlayers = eventData?.capacity?.currentParticipants || 0;
      const availableCourts = eventData?.courts?.length || 0;
      
      return {
        activeCourts: 0, // ยังไม่เริ่มเกม
        playingCount: 0,
        waitingCount: totalPlayers, // ผู้เล่นทั้งหมดรอคิว
        idleCount: 0,
        totalPlayers,
        availableCourts,
        courtsWithGames: [],
        playingPlayers: [],
        waitingPlayers: [],
        idlePlayers: []
      };
    }
  };

  const displayData = getDisplayData();

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
        
        {/* Game Status Overview */}
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
          
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">
                {matchingStatus ? 'คอร์ทที่ใช้งาน:' : 'คอร์ทที่พร้อม:'}
              </span>
              <span className="ml-2 font-medium text-green-600">
                {matchingStatus ? displayData.activeCourts : displayData.availableCourts} คอร์ท
              </span>
            </div>
            <div>
              <span className="text-gray-500">กำลังเล่น:</span>
              <span className="ml-2 font-medium text-blue-600">{displayData.playingCount} คน</span>
            </div>
            <div>
              <span className="text-gray-500">รอคิว:</span>
              <span className="ml-2 font-medium text-yellow-600">{displayData.waitingCount} คน</span>
            </div>
          </div>
        </div>

        {/* Active Courts and Games */}
        {displayData.courtsWithGames.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              คอร์ทที่กำลังใช้งาน ({displayData.courtsWithGames.length})
            </h3>
            
            {displayData.courtsWithGames.map((court: any) => (
              <div key={court.id} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-green-900">{court.name}</h4>
                    <p className="text-sm text-green-700">
                      เวลา: {court.startTime} - {court.endTime}
                    </p>
                    <p className="text-xs text-green-500">
                      ตอนนี้: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {court.activeGame && (
                      <p className="text-xs text-green-600">
                        เกม: {court.currentGameId}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className="bg-green-100 text-green-700">
                      🎾 กำลังเล่น
                    </Badge>
                    {!court.isAvailable && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        นอกเวลา
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Players in this court */}
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-green-800 mb-2">
                    ผู้เล่นในคอร์ท ({court.players.length} คน):
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {court.players.map((player: any) => (
                      <div key={player.id} className="bg-white rounded p-2 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {player.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-900">{player.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Court Control Buttons */}
                <div className="mt-4 flex space-x-2">
                  <Button
                    onClick={() => handleAdvanceMatching(court.id)}
                    disabled={loading}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    เปลี่ยนผู้เล่น
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="space-y-4">
          
          {/* Start/Restart Game Button */}
          {!gameStarted && (
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleSeedMatching}
                disabled={loading}
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
                    {/* เปลี่ยนข้อความตามสถานะ */}
                    {matchingStatus?.games && matchingStatus.games.length > 0 ? 'เริ่มเกมใหม่' : 'เริ่มเกมแรก'}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                {matchingStatus?.games && matchingStatus.games.length > 0 
                  ? 'กดเพื่อเริ่มเกมใหม่และจับคู่ผู้เล่นใหม่' 
                  : 'กดเพื่อเริ่มเกมแรกและจับคู่ผู้เล่นในคอร์ทที่มี'
                }
              </p>
            </div>
          )}

          {/* End All Games Button */}
          {gameStarted && (
            <div className="flex flex-col space-y-2">
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
                    จบเกมทั้งหมด
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                กดเพื่อจบเกมทั้งหมดและบันทึกผลการแข่งขัน
              </p>
            </div>
          )}
        </div>

        {/* Players by Status */}
        {(displayData.waitingPlayers.length > 0 || displayData.idlePlayers.length > 0) && (
          <div className="space-y-4">
            
            {/* Waiting Players */}
            {displayData.waitingPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-yellow-900 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                  ผู้เล่นที่รอคิว ({displayData.waitingPlayers.length} คน)
                </h3>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {displayData.waitingPlayers.map((player: any) => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-white rounded border-l-4 border-yellow-400">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {player.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{player.name}</p>
                            <p className="text-xs text-gray-500">
                              เล่นแล้ว: {player.runtime?.gamesPlayed || 0} เกม
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          ⏳ รอคิว
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Idle Players */}
            {displayData.idlePlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-blue-900 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-600" />
                  ผู้เล่นที่พัก ({displayData.idlePlayers.length} คน)
                </h3>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {displayData.idlePlayers.map((player: any) => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-white rounded border-l-4 border-blue-400">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {player.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{player.name}</p>
                            <p className="text-xs text-gray-500">
                              เล่นแล้ว: {player.runtime?.gamesPlayed || 0} เกม
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          💤 พัก
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Registered Players Summary */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            สรุปผู้เล่นทั้งหมด ({displayData.totalPlayers} คน)
          </h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {displayData.playingCount}
                </div>
                <div className="text-xs text-gray-500">กำลังเล่น</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {displayData.waitingCount}
                </div>
                <div className="text-xs text-gray-500">รอคิว</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {displayData.idleCount}
                </div>
                <div className="text-xs text-gray-500">พัก</div>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default PlayerMatching;