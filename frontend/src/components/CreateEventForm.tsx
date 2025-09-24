import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, MapPin } from 'lucide-react';
import { Court, Event } from '@/pages/Index';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateEventFormProps {
  onSubmit: (eventData: Omit<Event, 'id' | 'players' | 'status' | 'createdBy'>) => void;
  onCancel: () => void;
  editEvent?: Event | null;
  onUpdateEvent?: (eventId: string, updates: Partial<Event>) => void;
}

const CreateEventForm = ({ onSubmit, onCancel, editEvent, onUpdateEvent }: CreateEventFormProps) => {
  const { t } = useLanguage();
  const isEditing = !!editEvent;
  
  const [eventName, setEventName] = useState(editEvent?.eventName || '');
  const [eventDate, setEventDate] = useState(editEvent?.eventDate || '');
  const [venue, setVenue] = useState(editEvent?.venue || '');
  const [maxPlayers, setMaxPlayers] = useState(editEvent?.maxPlayers || 12);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(editEvent?.shuttlecockPrice || 20);
  const [courtHourlyRate, setCourtHourlyRate] = useState(editEvent?.courtHourlyRate || 150);
  const [courts, setCourts] = useState<Court[]>(
    editEvent?.courts && editEvent.courts.length > 0 
      ? editEvent.courts 
      : [{ courtNumber: 1, startTime: '20:00', endTime: '22:00' }]
  );

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  const calculateTotalCourtsHours = () => {
    return courts.reduce((total, court) => {
      const start = new Date(`2000-01-01T${court.startTime}`);
      const end = new Date(`2000-01-01T${court.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + Math.max(0, hours);
    }, 0);
  };

  const addCourt = () => {
    const newCourtNumber = Math.max(...courts.map(c => c.courtNumber), 0) + 1;
    setCourts([...courts, { 
      courtNumber: newCourtNumber, 
      startTime: '20:00', 
      endTime: '22:00' 
    }]);
  };

  const removeCourt = (index: number) => {
    if (courts.length > 1) {
      setCourts(courts.filter((_, i) => i !== index));
    }
  };

  const updateCourt = (index: number, field: keyof Court, value: string | number) => {
    const updatedCourts = courts.map((court, i) => 
      i === index ? { ...court, [field]: value } : court
    );
    setCourts(updatedCourts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editEvent && onUpdateEvent) {
      // Update existing event
      onUpdateEvent(editEvent.id, {
        eventName,
        eventDate,
        venue,
        maxPlayers,
        shuttlecockPrice,
        courtHourlyRate,
        courts,
      });
    } else {
      // Create new event
      onSubmit({
        eventName,
        eventDate,
        venue,
        maxPlayers,
        shuttlecockPrice,
        courtHourlyRate,
        courts,
      });
    }
  };

  const totalHours = calculateTotalCourtsHours();
  const estimatedCost = totalHours * courtHourlyRate;

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent font-bold">
          {isEditing ? 'แก้ไขอีเวนต์' : t('events.create')}
        </CardTitle>
        <CardDescription>
          {isEditing ? 'แก้ไขข้อมูลอีเวนต์' : t('app.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventName" className="text-gray-700 font-medium">{t('form.event_name')}</Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Weekly Badminton Session"
                required
                className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate" className="text-gray-700 font-medium">{t('form.event_date')}</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={today}
                required
                className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue" className="text-gray-700 font-medium">{t('form.venue')}</Label>
            <Select value={venue} onValueChange={setVenue}>
              <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="เลือกสถานที่เล่นแบดมินตัน" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="สนามกีฬาแห่งชาติ">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                    <div>
                      <p className="font-medium">สนามกีฬาแห่งชาติ</p>
                      <p className="text-xs text-gray-500">ราเมศร์วร, ห้วยขวาง, กรุงเทพฯ</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="สโมสรกีฬาบางแสน">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-green-500" />
                    <div>
                      <p className="font-medium">สโมสรกีฬาบางแสน</p>
                      <p className="text-xs text-gray-500">บางแสน, ชลบุรี</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="ศูนย์กีฬาลำพิมิ">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                    <div>
                      <p className="font-medium">ศูนย์กีฬาลำพิมิ</p>
                      <p className="text-xs text-gray-500">นครพิงค์, นครสวรรค์</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="สนามกีฬาธรรมศาสตร์">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                    <div>
                      <p className="font-medium">สนามกีฬาธรรมศาสตร์</p>
                      <p className="text-xs text-gray-500">รังสิต, ปทุมธานี</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="ศูนย์กีฬามหิดล">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-red-500" />
                    <div>
                      <p className="font-medium">ศูนย์กีฬามหิดล</p>
                      <p className="text-xs text-gray-500">พุทธมณฑล, นครปฐม</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="สนามแบดมินตัน The Mall บางกะปิ">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                    <div>
                      <p className="font-medium">สนามแบดมินตัน The Mall บางกะปิ</p>
                      <p className="text-xs text-gray-500">ลาดพร้าว, กรุงเทพฯ</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing and Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPlayers" className="text-gray-700 font-medium">{t('form.max_players')}</Label>
              <Input
                id="maxPlayers"
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                min="2"
                required
                className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shuttlecockPrice" className="text-gray-700 font-medium">{t('form.shuttlecock_price')}</Label>
              <Input
                id="shuttlecockPrice"
                type="number"
                value={shuttlecockPrice}
                onChange={(e) => setShuttlecockPrice(Number(e.target.value))}
                min="0"
                step="0.01"
                required
                className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courtHourlyRate" className="text-gray-700 font-medium">{t('form.court_rate')}</Label>
              <Input
                id="courtHourlyRate"
                type="number"
                value={courtHourlyRate}
                onChange={(e) => setCourtHourlyRate(Number(e.target.value))}
                min="0"
                step="0.01"
                required
                className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>
          </div>

          {/* Courts */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-gray-700 font-medium text-lg">{t('form.courts')}</Label>
              <Button
                type="button"
                onClick={addCourt}
                size="sm"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('form.add_court')}
              </Button>
            </div>

            {courts.map((court, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-gray-600">{t('form.court_number')}</Label>
                    <Input
                      type="number"
                      value={court.courtNumber}
                      onChange={(e) => updateCourt(index, 'courtNumber', Number(e.target.value))}
                      min="1"
                      className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">{t('form.start_time')}</Label>
                    <Input
                      type="time"
                      value={court.startTime}
                      onChange={(e) => updateCourt(index, 'startTime', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">{t('form.end_time')}</Label>
                    <Input
                      type="time"
                      value={court.endTime}
                      onChange={(e) => updateCourt(index, 'endTime', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>

                  <div className="flex justify-end">
                    {courts.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeCourt(index)}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Cost Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-lg">
              <h4 className="font-bold text-blue-900 mb-3 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Cost Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total Court Hours:</span>
                  <span className="font-medium">{totalHours.toFixed(1)} hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Court Cost:</span>
                  <span className="font-medium">฿{estimatedCost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cost per player ({maxPlayers} players):</span>
                  <span>฿{(estimatedCost / maxPlayers).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium"
            >
              {isEditing ? 'อัพเดทอีเวนต์' : t('form.create_event')}
            </Button>
            <Button 
              type="button" 
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-50 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 font-medium"
            >
              {t('form.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateEventForm;
