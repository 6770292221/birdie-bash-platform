
import React, { useMemo } from 'react';
import { Calendar, MapPin, Users, Clock, Settings, UserX, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/pages/Index';
import { useLanguage } from '@/contexts/LanguageContext';
import { EventStatusType, getEventStatusLabel, getEventStatusColor } from '@/types/event';

interface EventCardProps {
  event: Event;
  onSelectEvent?: (event: Event) => void;
  onCancelRegistration?: (eventId: string, playerId: string, isEventDay: boolean) => void;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
  onAddPlayer?: (eventId: string, playerName: string) => void;
  showAdminFeatures?: boolean;
}

type EventCourt = {
  courtNumber?: number;
  startTime?: string | null;
  endTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
};

type ParsedTime = { label: string; value: number };

const isEventCourt = (value: unknown): value is EventCourt => {
  return typeof value === 'object' && value !== null;
};

const parseTimeValue = (value?: string | null): ParsedTime | null => {
  if (!value) return null;

  const [hoursStr, minutesStr = '00'] = String(value).split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { label, value: hours * 60 + minutes };
};

const formatTimeLabel = (value?: string | null) => {
  const parsed = parseTimeValue(value);
  if (parsed) return parsed.label;
  return value ?? '--';
};

const EventCard = ({ event, onSelectEvent, onCancelRegistration, onEditEvent, onDeleteEvent, onAddPlayer, showAdminFeatures = false }: EventCardProps) => {
  const { t } = useLanguage();

  // Debug log
  console.log('EventCard - event:', event);
  console.log('EventCard - event.courts:', event.courts);

  const registeredPlayers = event.players.filter(p => p.status === 'registered');
  const waitlistPlayers = event.players.filter(p => p.status === 'waitlist');
  const cancelledPlayers = event.players.filter(p => p.status === 'cancelled');

  const courts = useMemo<EventCourt[]>(() => {
    if (!Array.isArray(event.courts)) {
      return [];
    }

    return event.courts.filter(isEventCourt);
  }, [event.courts]);

  const timeRangeLabel = useMemo(() => {
    if (courts.length === 0) {
      return null;
    }

    const startTimes = courts
      .map(court => parseTimeValue(court.startTime ?? court.actualStartTime))
      .filter((entry): entry is ParsedTime => entry !== null);

    const endTimes = courts
      .map(court => parseTimeValue(court.endTime ?? court.actualEndTime))
      .filter((entry): entry is ParsedTime => entry !== null);

    if (startTimes.length === 0 || endTimes.length === 0) {
      return null;
    }

    const earliestStart = startTimes.reduce((earliest, current) =>
      current.value < earliest.value ? current : earliest
    );

    const latestEnd = endTimes.reduce((latest, current) =>
      current.value > latest.value ? current : latest
    );

    if (earliestStart.value === latestEnd.value) {
      return earliestStart.label;
    }

    return `${earliestStart.label} - ${latestEnd.label}`;
  }, [courts]);

  return (
    <Card className="group relative overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl bg-white transition-all duration-300 hover:-translate-y-1 w-full">
      {/* Status Badge - Top Right */}
      <div className="absolute top-0 right-0 z-10">
        <Badge
          className={`rounded-none rounded-bl-lg px-3 py-1 font-medium text-xs shadow-md ${getEventStatusColor(event.status as EventStatusType)}`}
        >
          {getEventStatusLabel(event.status as EventStatusType)}
        </Badge>
      </div>

      {/* Header Section */}
      <CardHeader className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-4 border-b border-gray-100">
        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 break-words pr-20">
          {event.eventName}
        </CardTitle>
        <div className="space-y-1">
          <CardDescription className="flex items-center text-gray-600 text-sm">
            <Calendar className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
            <span className="break-words font-medium">{event.eventDate}</span>
          </CardDescription>
          {timeRangeLabel && (
            <CardDescription className="flex items-center text-gray-600 text-sm ml-6">
              <Clock className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
              <span className="break-words font-medium">
                {timeRangeLabel}
              </span>
            </CardDescription>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">สถานที่</p>
              <p className="text-gray-900 font-medium break-words">{event.location}</p>
            </div>
          </div>

          {/* Court Times */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">เวลาแข่ง</p>
              <p className="text-gray-900 font-medium text-sm break-words">
                {courts.map(court => {
                  const startLabel = formatTimeLabel(court.actualStartTime ?? court.startTime);
                  const endLabel = formatTimeLabel(court.actualEndTime ?? court.endTime);
                  return `Court ${court.courtNumber}: ${startLabel} - ${endLabel}`;
                }).join(', ')}
              </p>
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">ผู้เข้าร่วม</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 font-medium">
                    {registeredPlayers.length}/{event.maxPlayers}
                  </p>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (registeredPlayers.length / event.maxPlayers) * 100)}%`
                      }}
                    />
                  </div>
                </div>
                {waitlistPlayers.length > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs bg-amber-50">
                    รอคิว {waitlistPlayers.length} คน
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player List - Mobile Optimized */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              รายชื่อผู้ลงทะเบียน
            </h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {registeredPlayers.length} คน
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {registeredPlayers.map(player => (
              <div key={player.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm truncate">
                    {player.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {player.startTime || '20:00'} - {player.endTime}
                  </p>
                </div>
                {showAdminFeatures && (
                  <Button
                    onClick={() => onCancelRegistration?.(event.id, player.id, true)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                  >
                    <UserX className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {registeredPlayers.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">ยังไม่มีผู้ลงทะเบียน</p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Management Buttons */}
        {showAdminFeatures && (
          <div className="mt-6 space-y-3 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              {onEditEvent && (
                <Button
                  onClick={() => onEditEvent(event)}
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  แก้ไข
                </Button>
              )}
              {onDeleteEvent && (
                <Button
                  onClick={() => onDeleteEvent(event.id)}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบ
                </Button>
              )}
            </div>
            {onSelectEvent && (
              <Button
                onClick={() => onSelectEvent(event)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-calculator"></i>
                  คำนวณค่าใช้จ่าย
                </span>
              </Button>
            )}
          </div>
        )}

        {/* Cost Summary for completed events */}
        {event.status === 'completed' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h5 className="font-medium text-green-900 text-sm">สรุปค่าใช้จ่าย</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-green-700">ค่าคอร์ท</span>
                  <span className="font-medium text-green-900">฿{event.courtHourlyRate}/ชั่วโมง</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">ลูกขนไก่ใช้</span>
                  <span className="font-medium text-green-900">{event.shuttlecocksUsed || 0} ลูก</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCard;
