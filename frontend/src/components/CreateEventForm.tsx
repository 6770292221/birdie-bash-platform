import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TimePicker from '@/components/TimePicker';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, MapPin, Phone } from 'lucide-react';
import { Court, Event } from '@/pages/Index';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/utils/api';

interface CreateEventFormProps {
  onSubmit: (eventData: Omit<Event, 'id' | 'players' | 'status' | 'createdBy'>) => void;
  onCancel: () => void;
  editEvent?: Event | null;
  onUpdateEvent?: (eventId: string, updates: Partial<Event>) => void;
}

const CreateEventForm = ({ onSubmit, onCancel, editEvent, onUpdateEvent }: CreateEventFormProps) => {
  const { t } = useLanguage();
  const isEditing = !!editEvent;

  // Venue state
  const [venues, setVenues] = useState<any[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  
  const [eventName, setEventName] = useState(editEvent?.eventName || '');
  const [eventDate, setEventDate] = useState(editEvent?.eventDate || '');
  const [venue, setVenue] = useState(editEvent?.venue || '');
  const [maxPlayers, setMaxPlayers] = useState(editEvent?.maxPlayers || 12);
  const [waitlistEnabled, setWaitlistEnabled] = useState((editEvent as any)?.waitlistEnabled || false);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(editEvent?.shuttlecockPrice || 20);
  const [courtHourlyRate, setCourtHourlyRate] = useState(editEvent?.courtHourlyRate || 150);
  const [penaltyFee, setPenaltyFee] = useState((editEvent as any)?.penaltyFee || 0);
  const [courts, setCourts] = useState<Court[]>(
    editEvent?.courts && editEvent.courts.length > 0
      ? editEvent.courts
      : [{ courtNumber: 1, startTime: '20:00', endTime: '22:00' }]
  );
  const [venueError, setVenueError] = useState<string>('');
  const [eventNameError, setEventNameError] = useState<string>('');
  const [eventDateError, setEventDateError] = useState<string>('');
  const [courtsError, setCourtsError] = useState<string>('');
  const [maxPlayersError, setMaxPlayersError] = useState<string>('');
  const [shuttlecockPriceError, setShuttlecockPriceError] = useState<string>('');
  const [courtHourlyRateError, setCourtHourlyRateError] = useState<string>('');

  const selectedVenue = useMemo(() => {
    if (!venue) return null;
    return venues.find((item: any) => item.name === venue) || null;
  }, [venue, venues]);

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  // Fetch venues on component mount
  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setVenuesLoading(true);
    try {
      const response = await apiClient.getVenues({ limit: 50 });
      if (response.success && response.data) {
        setVenues(response.data.venues || []);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
    setVenuesLoading(false);
  };

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
      const newCourts = courts.filter((_, i) => i !== index);
      setCourts(newCourts);
      setCourtsError(''); // Clear error when removing court
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

    // Reset all errors
    setEventNameError('');
    setEventDateError('');
    setVenueError('');
    setCourtsError('');
    setMaxPlayersError('');
    setShuttlecockPriceError('');
    setCourtHourlyRateError('');

    // Client-side validation
    let hasError = false;

    if (!eventName || eventName.trim().length === 0) {
      setEventNameError(t('validation.required_event_name'));
      hasError = true;
    }

    if (!eventDate || eventDate.trim().length === 0) {
      setEventDateError(t('validation.required_event_date'));
      hasError = true;
    }

    if (!venue || venue.trim().length === 0) {
      setVenueError(t('validation.required_venue'));
      hasError = true;
    }

    if (!courts || courts.length === 0) {
      setCourtsError(t('validation.required_court'));
      hasError = true;
    }

    if (!maxPlayers || maxPlayers <= 0) {
      setMaxPlayersError('จำนวนผู้เล่นต้องมากกว่า 0');
      hasError = true;
    }

    if (shuttlecockPrice < 0) {
      setShuttlecockPriceError(t('validation.positive_shuttlecock_price'));
      hasError = true;
    }

    if (!courtHourlyRate || courtHourlyRate <= 0) {
      setCourtHourlyRateError('ค่าเช่าสนามต้องมากกว่า 0');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (isEditing && editEvent && onUpdateEvent) {
      // Update existing event
      onUpdateEvent(editEvent.id, {
        eventName,
        eventDate,
        venue,
        maxPlayers,
        waitlistEnabled,
        shuttlecockPrice,
        courtHourlyRate,
        penaltyFee,
        courts,
      });
    } else {
      // Create new event
      onSubmit({
        eventName,
        eventDate,
        venue,
        maxPlayers,
        waitlistEnabled,
        shuttlecockPrice,
        courtHourlyRate,
        penaltyFee,
        courts,
      } as any);
    }
  };

  const totalHours = calculateTotalCourtsHours();
  const estimatedCost = totalHours * courtHourlyRate;

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent font-bold">
          {isEditing ? t('events.edit') : t('events.create')}
        </CardTitle>
        <CardDescription>
          {isEditing ? t('events.edit_description') : t('app.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventName" className="text-gray-700 font-medium">{t('form.event_name')} <span className="text-red-500">*</span></Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => { setEventName(e.target.value); setEventNameError(''); }}
                placeholder="e.g., Weekly Badminton Session"
                required
                className={`border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${eventNameError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {eventNameError && (
                <p className="text-sm text-red-600 mt-1">{eventNameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate" className="text-gray-700 font-medium">{t('form.event_date')} <span className="text-red-500">*</span></Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => { setEventDate(e.target.value); setEventDateError(''); }}
                min={today}
                required
                className={`border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${eventDateError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {eventDateError && (
                <p className="text-sm text-red-600 mt-1">{eventDateError}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue" className="text-gray-700 font-medium">{t('form.venue')} <span className="text-red-500">*</span></Label>
            <Select value={venue} onValueChange={(value) => { setVenue(value); setVenueError(''); }} disabled={venuesLoading} required>
              <SelectTrigger className={`border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 h-auto items-start py-3 ${venueError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}>
                <SelectValue
                  placeholder={venuesLoading ? t('form.loading_venues') : t('form.select_venue')}
                  asChild
                >
                  {selectedVenue ? (
                    <div className="flex w-full flex-col gap-2 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                            {selectedVenue.name}
                          </p>
                          {selectedVenue.address && (
                            <p className="text-xs text-gray-500 leading-tight">
                              {selectedVenue.address}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedVenue.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="truncate">{selectedVenue.phone}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="truncate">
                        {venuesLoading ? t('form.loading_venues') : t('form.select_venue')}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {venues.length > 0 ? venues.map((venueItem: any, index: number) => {
                  const colors = ['blue', 'green', 'purple', 'orange', 'red', 'indigo', 'yellow', 'pink', 'teal', 'cyan'];
                  const color = colors[index % colors.length];
                  return (
                    <SelectItem key={venueItem.id} value={venueItem.name}>
                      <div className="flex items-center space-x-3 py-2">
                        <MapPin className={`w-4 h-4 text-${color}-500 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{venueItem.name}</p>
                          <p className="text-xs text-gray-500 truncate">{venueItem.address}</p>
                          {venueItem.phone && (
                            <div className="flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              <p className="text-xs text-gray-400">{venueItem.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                }) : (
                  <SelectItem value="no-venues" disabled>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-500">{t('form.no_venues_found')}</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {venueError && (
              <p className="text-sm text-red-600 mt-1">{venueError}</p>
            )}
          </div>

          {/* Pricing and Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPlayers" className="text-gray-700 font-medium">{t('form.max_players')} <span className="text-red-500">*</span></Label>
              <Input
                id="maxPlayers"
                type="number"
                value={maxPlayers}
                onChange={(e) => { setMaxPlayers(Number(e.target.value)); setMaxPlayersError(''); }}
                min="1"
                required
                className={`border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${maxPlayersError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {maxPlayersError && (
                <p className="text-sm text-red-600 mt-1">{maxPlayersError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shuttlecockPrice" className="text-gray-700 font-medium">{t('form.shuttlecock_price')} <span className="text-red-500">*</span></Label>
              <Input
                id="shuttlecockPrice"
                type="number"
                value={shuttlecockPrice}
                onChange={(e) => { setShuttlecockPrice(Number(e.target.value)); setShuttlecockPriceError(''); }}
                min="0"
                step="0.01"
                required
                className={`border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${shuttlecockPriceError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {shuttlecockPriceError && (
                <p className="text-sm text-red-600 mt-1">{shuttlecockPriceError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courtHourlyRate" className="text-gray-700 font-medium">{t('form.court_rate')} <span className="text-red-500">*</span></Label>
              <Input
                id="courtHourlyRate"
                type="number"
                value={courtHourlyRate}
                onChange={(e) => { setCourtHourlyRate(Number(e.target.value)); setCourtHourlyRateError(''); }}
                min="0"
                step="0.01"
                required
                className={`border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${courtHourlyRateError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {courtHourlyRateError && (
                <p className="text-sm text-red-600 mt-1">{courtHourlyRateError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="penaltyFee" className="text-gray-700 font-medium">ค่าปรับ</Label>
              <Input
                id="penaltyFee"
                type="number"
                value={penaltyFee}
                onChange={(e) => setPenaltyFee(Number(e.target.value))}
                min="0"
                step="0.01"
                className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>
          </div>

          {/* Waitlist Toggle */}
          <div className="mt-2">
            <label className="inline-flex items-center space-x-2">
              <Checkbox id="waitlistEnabled" checked={waitlistEnabled} onCheckedChange={(v: any) => setWaitlistEnabled(Boolean(v))} />
              <span className="text-gray-700">{t('form.enable_waitlist')}</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">ถ้าเปิด ระบบจะอนุญาตผู้เล่นเข้าคิวเมื่อที่นั่งเต็ม</p>
          </div>

          {/* Courts */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-gray-700 font-medium text-lg">{t('form.courts')} <span className="text-red-500">*</span></Label>
              <Button
                type="button"
                onClick={() => { addCourt(); setCourtsError(''); }}
                size="sm"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('form.add_court')}
              </Button>
            </div>
            {courtsError && (
              <p className="text-sm text-red-600">{courtsError}</p>
            )}

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
                    <TimePicker
                      value={court.startTime}
                      onChange={(v) => updateCourt(index, 'startTime', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">{t('form.end_time')}</Label>
                    <TimePicker
                      value={court.endTime}
                      onChange={(v) => updateCourt(index, 'endTime', v)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => removeCourt(index)}
                      size="sm"
                      variant="outline"
                      disabled={courts.length <= 1}
                      className={`${
                        courts.length <= 1
                          ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                          : 'border-red-300 text-red-600 hover:bg-red-50 hover:shadow-md transform hover:-translate-y-0.5'
                      } transition-all duration-200`}
                      title={courts.length <= 1 ? 'ต้องมีอย่างน้อย 1 สนาม' : 'ลบสนาม'}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
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
              {isEditing ? t('form.update_event') : t('form.create_event')}
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
