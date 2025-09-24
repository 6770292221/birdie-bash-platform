
import React, { useState } from 'react';
import { Calendar, MapPin, Users, Clock, Settings, UserX, Edit, Trash2, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Event } from '@/pages/Index';
import { useLanguage } from '@/contexts/LanguageContext';

interface EventCardProps {
  event: Event;
  onSelectEvent?: (event: Event) => void;
  onCancelRegistration?: (eventId: string, playerId: string, isEventDay: boolean) => void;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
  onAddPlayer?: (eventId: string, playerName: string) => void;
  showAdminFeatures?: boolean;
}

const EventCard = ({ event, onSelectEvent, onCancelRegistration, onEditEvent, onDeleteEvent, onAddPlayer, showAdminFeatures = false }: EventCardProps) => {
  const { t } = useLanguage();
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState<string>('');
  
  const registeredPlayers = event.players.filter(p => p.status === 'registered');
  const waitlistPlayers = event.players.filter(p => p.status === 'waitlist');
  const cancelledPlayers = event.players.filter(p => p.status === 'cancelled');

  // Mock player list - these are available players to add
  const mockAvailablePlayers = [
    'สมชาย ใจดี',
    'สมหญิง รักเกม', 
    'ธนากร เทพบุตร',
    'มานี สมบูรณ์',
    'วิชัย แกล้วกล้า',
    'นิภา มีความสุข',
    'ประชา ชาติไทย',
    'สุนทร บุญมาก',
    'รัตนา ทองคำ',
    'กิติ สว่างใส',
    'อรุณ เช้าใหม่',
    'พิมพ์ ใสสะอาด'
  ].filter(playerName => 
    // Filter out players who are already registered or on waitlist
    !event.players.some(p => p.name === playerName && (p.status === 'registered' || p.status === 'waitlist'))
  );

  const handleAddPlayer = () => {
    if (selectedPlayerToAdd && onAddPlayer) {
      onAddPlayer(event.id, selectedPlayerToAdd);
      setSelectedPlayerToAdd('');
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 break-words">
              {event.eventName}
            </CardTitle>
            <CardDescription className="flex items-center text-gray-600 mt-1 text-sm">
              <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="break-words">{event.eventDate}</span>
            </CardDescription>
          </div>
          <Badge 
            variant={event.status === 'upcoming' || event.status === 'in_progress' ? 'default' : 'secondary'}
            className={`flex-shrink-0 ${
              event.status === 'in_progress' ? 'bg-blue-600 text-white' :
              event.status === 'calculating' ? 'bg-yellow-600 text-white' :
              event.status === 'awaiting_payment' ? 'bg-orange-600 text-white' :
              event.status === 'completed' ? 'bg-gray-600 text-white' : ''
            }`}
          >
            {t(`events.${event.status}`)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-start text-gray-600 text-sm">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <span className="break-words">{event.venue}</span>
        </div>

        <div className="flex items-start text-gray-600 text-sm">
          <Clock className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <span className="break-words">
            {event.courts.map(court => `Court ${court.courtNumber}: ${court.startTime} - ${court.endTime}`).join(', ')}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center text-gray-600 text-sm">
            <Users className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{registeredPlayers.length}/{event.maxPlayers} {t('players.registered')}</span>
          </div>
          {waitlistPlayers.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
              {t('players.waitlist')} {waitlistPlayers.length} คน
            </Badge>
          )}
        </div>

        {/* Player List - Mobile Optimized */}
        <div className="space-y-2">
          <h4 className="font-medium text-green-700 text-sm">{t('players.registered')}:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {registeredPlayers.map(player => (
              <div key={player.id} className="flex justify-between items-center text-xs sm:text-sm bg-gray-50 rounded p-2">
                <span className="text-gray-700 font-medium break-words flex-1 min-w-0 pr-2">
                  {player.name}
                </span>
                {showAdminFeatures ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {player.startTime || '20:00'} - {player.endTime}
                    </span>
                    <Button
                      onClick={() => onCancelRegistration?.(event.id, player.id, true)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 p-1 h-auto min-w-0"
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {player.startTime || '20:00'} - {player.endTime}
                  </span>
                )}
              </div>
            ))}
            {registeredPlayers.length === 0 && (
              <p className="text-xs text-gray-500 italic text-center py-2">ยังไม่มีผู้ลงทะเบียน</p>
            )}
          </div>
        </div>

        {/* Admin Add Player Section */}
        {showAdminFeatures && onAddPlayer && mockAvailablePlayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700 text-sm">เพิ่มผู้เล่น:</h4>
            <div className="flex gap-2">
              <Select value={selectedPlayerToAdd} onValueChange={setSelectedPlayerToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="เลือกผู้เล่น" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg z-[60]">
                  {mockAvailablePlayers.map(playerName => (
                    <SelectItem key={playerName} value={playerName}>
                      {playerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddPlayer}
                disabled={!selectedPlayerToAdd}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-600 hover:bg-green-50 px-3"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Admin Management Buttons */}
        {showAdminFeatures && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {onEditEvent && (
                <Button 
                  onClick={() => onEditEvent(event)}
                  variant="outline"
                  className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  แก้ไข
                </Button>
              )}
              {onDeleteEvent && (
                <Button 
                  onClick={() => onDeleteEvent(event.id)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบ
                </Button>
              )}
            </div>
            {onSelectEvent && (
              <Button 
                onClick={() => onSelectEvent(event)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
              >
                <i className="fas fa-calculator mr-2"></i>
                Cost Calculation
              </Button>
            )}
          </div>
        )}

        {/* Cost Summary for completed events */}
        {event.status === 'completed' && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <div>ค่าคอร์ท: ฿{event.courtHourlyRate}/ชั่วโมง</div>
              <div>ลูกขนไก่ใช้: {event.shuttlecocksUsed || 0} ลูก</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCard;
