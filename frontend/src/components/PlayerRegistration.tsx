
import { useState } from 'react';
import { Calendar, MapPin, Users, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Event, Player } from '@/pages/Index';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface PlayerRegistrationProps {
  event: Event;
  onRegister: (eventId: string, playerData: Omit<Player, 'id' | 'registrationTime' | 'status'>) => void;
  onCancelRegistration: (eventId: string, playerId: string, isEventDay: boolean) => void;
}

const PlayerRegistration = ({ event, onRegister, onCancelRegistration }: PlayerRegistrationProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  // Mock player names for auto-generation
  const mockPlayerNames = [
    'สมชาย ใจดี', 'สมหญิง รักเกม', 'ธนากร เทพบุตร', 'มานี สมบูรณ์',
    'วิชัย แกล้วกล้า', 'นิภา มีความสุข', 'ประชา ชาติไทย', 'สุนทร บุญมาก',
    'รัตนา ทองคำ', 'กิติ สว่างใส', 'อรุณ เช้าใหม่', 'พิมพ์ ใสสะอาด',
    'วิมล ศรีสุข', 'จิรา ลาภยืน', 'ชาย ดีงาม', 'นิตยา แสงทอง'
  ];
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const { toast } = useToast();

  const registeredPlayers = event.players.filter(p => p.status === 'registered');
  const waitlistPlayers = event.players.filter(p => p.status === 'waitlist');
  const isFull = registeredPlayers.length >= event.maxPlayers;

  // Check if it's event day
  const isEventDay = new Date().toDateString() === new Date(event.eventDate).toDateString();

  // Get available times based on court schedules (hourly intervals)
  const getAvailableTimes = () => {
    const times: string[] = [];
    const allStartTimes: number[] = [];
    const allEndTimes: number[] = [];

    event.courts.forEach(court => {
      const start = new Date(`2000-01-01T${court.startTime}`).getTime();
      const end = new Date(`2000-01-01T${court.endTime}`).getTime();
      allStartTimes.push(start);
      allEndTimes.push(end);
    });

    const earliestStart = Math.min(...allStartTimes);
    const latestEnd = Math.max(...allEndTimes);

    // Generate hourly intervals from earliest start to latest end
    for (let time = earliestStart; time <= latestEnd; time += 60 * 60000) {
      const timeString = new Date(time).toTimeString().slice(0, 5);
      times.push(timeString);
    }

    return times;
  };

  const availableTimes = getAvailableTimes();

  const generateMockName = () => {
    // Get available names (not already used in this event)
    const usedNames = event.players.map(p => p.name);
    const availableNames = mockPlayerNames.filter(name => !usedNames.includes(name));
    
    if (availableNames.length > 0) {
      return availableNames[Math.floor(Math.random() * availableNames.length)];
    }
    
    // If all names are used, generate a numbered variant
    return `ผู้เล่น ${event.players.length + 1}`;
  };

  const handleQuickJoin = () => {
    // Use full event time (earliest start to latest end)
    const allStartTimes: number[] = [];
    const allEndTimes: number[] = [];

    event.courts.forEach(court => {
      const start = new Date(`2000-01-01T${court.startTime}`).getTime();
      const end = new Date(`2000-01-01T${court.endTime}`).getTime();
      allStartTimes.push(start);
      allEndTimes.push(end);
    });

    const earliestStart = new Date(Math.min(...allStartTimes)).toTimeString().slice(0, 5);
    const latestEnd = new Date(Math.max(...allEndTimes)).toTimeString().slice(0, 5);

    const mockName = generateMockName();

    onRegister(event.id, {
      name: mockName,
      email: '',
      startTime: earliestStart,
      endTime: latestEnd,
      userId: user?.id,
    });
    
    toast({
      title: "Registration Successful",
      description: isFull ? `${mockName} has been added to the waitlist for full event time` : `${mockName} has been registered for the full event time`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please select both start and end times",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Error", 
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    const mockName = generateMockName();

    onRegister(event.id, {
      name: mockName,
      email: '',
      startTime,
      endTime,
      userId: user?.id,
    });
    
    setStartTime('');
    setEndTime('');
    setShowForm(false);
    
    toast({
      title: "Registration Successful",
      description: isFull ? "You've been added to the waitlist" : "You've been registered for the event",
    });
  };

  const handleCancelRegistration = (playerId: string, playerName: string) => {
    onCancelRegistration(event.id, playerId, isEventDay);
    
    toast({
      title: "Registration Cancelled",
      description: isEventDay 
        ? `${playerName}'s registration cancelled. 100 THB fine applied for same-day cancellation.`
        : `${playerName}'s registration cancelled successfully.`,
      variant: isEventDay ? "destructive" : "default",
    });
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl text-green-900">{event.eventName}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(event.eventDate).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge 
            variant="secondary" 
            className={isFull ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}
          >
            {isFull ? t('status.full') : t('status.available')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="text-sm">{event.venue}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-green-600" />
            <span>{registeredPlayers.length}/{event.maxPlayers}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-600" />
            <span>{event.courts.length} courts</span>
          </div>
        </div>

        {waitlistPlayers.length > 0 && (
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800">
              {waitlistPlayers.length} {t('status.waitlist')}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Playing Times:</h4>
          <div className="space-y-1">
            {event.courts.map((court, index) => (
              <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                <span>Court {court.courtNumber}</span>
                <span>{court.startTime} - {court.endTime}</span>
              </div>
            ))}
          </div>
        </div>

        {!showForm ? (
          <div className="space-y-2">
            <Button
              onClick={handleQuickJoin}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="sm"
              disabled={event.status === 'completed'}
            >
{t('buttons.join_full_time')}
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="w-full border-green-600 text-green-600 hover:bg-green-50"
              size="sm"
              disabled={event.status === 'completed'}
            >
{t('buttons.select_custom_time')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">{t('labels.auto_name_info')}</Label>
              <p className="text-sm text-gray-500">{t('labels.select_play_time')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-gray-700">{t('form.start_time')}</Label>
                <Select value={startTime} onValueChange={setStartTime} required>
                  <SelectTrigger className="border-green-200 focus:border-green-500">
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 z-50">
                    {availableTimes.slice(0, -1).map(time => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-gray-700">{t('form.end_time')}</Label>
                <Select value={endTime} onValueChange={setEndTime} required>
                  <SelectTrigger className="border-green-200 focus:border-green-500">
                    <SelectValue placeholder="End" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 z-50">
                    {availableTimes.filter(time => !startTime || time > startTime).map(time => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isFull ? t('form.join_waitlist') : t('form.register')}
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                variant="outline"
                className="flex-1 border-gray-300"
                size="sm"
              >
                {t('form.cancel')}
              </Button>
            </div>
          </form>
        )}

        {registeredPlayers.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <h4 className="font-medium text-gray-700 text-sm">{t('players.registered')}:</h4>
            <div className="space-y-1">
              {registeredPlayers.map((player) => (
                <div key={player.id} className="flex justify-between items-center text-xs bg-green-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{player.name}</span>
                    <span className="text-gray-500 ml-2">
                      {player.startTime || '20:00'} - {player.endTime}
                    </span>
                  </div>
                  {/* Only show cancel button if it's the current user's registration */}
                  {user && player.userId === user.id && (
                    <Button
                      onClick={() => handleCancelRegistration(player.id, player.name)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {waitlistPlayers.length > 0 && (
          <div className="space-y-2 max-h-24 overflow-y-auto">
            <h4 className="font-medium text-gray-700 text-sm">{t('players.waitlist')}:</h4>
            <div className="space-y-1">
              {waitlistPlayers.map((player) => (
                <div key={player.id} className="flex justify-between items-center text-xs bg-yellow-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{player.name}</span>
                    <span className="text-gray-500 ml-2">
                      {player.startTime || '20:00'} - {player.endTime}
                    </span>
                  </div>
                  {/* Only show cancel button if it's the current user's registration */}
                  {user && player.userId === user.id && (
                    <Button
                      onClick={() => handleCancelRegistration(player.id, player.name)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerRegistration;
