import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CreateEventForm from '@/components/CreateEventForm';
import { apiClient } from '@/utils/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Minimal Event and Court shape expected by CreateEventForm props
export interface Court { courtNumber: number; startTime: string; endTime: string; }
export interface Event {
  id: string;
  eventName: string;
  eventDate: string; // YYYY-MM-DD
  venue: string; // mapped to location for API
  maxPlayers: number; // mapped to capacity.maxParticipants
  shuttlecockPrice: number;
  courtHourlyRate: number;
  penaltyFee?: number;
  courts: Court[];
  status: string;
  createdBy?: string;
  players: any[];
}

const CreateEventPage = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-700">ต้องเป็นผู้ดูแลระบบ (Admin) เท่านั้น</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (
    data: Omit<Event, 'id' | 'players' | 'status' | 'createdBy'>
  ) => {
    try {
      const payload = {
        eventName: data.eventName,
        eventDate: data.eventDate,
        location: data.venue,
        capacity: {
          maxParticipants: data.maxPlayers,
          currentParticipants: 0,
          waitlistEnabled: (data as any).waitlistEnabled ?? false,
        },
        shuttlecockPrice: data.shuttlecockPrice,
        courtHourlyRate: data.courtHourlyRate,
        penaltyFee: data.penaltyFee,
        courts: data.courts.map((c) => ({
          courtNumber: c.courtNumber,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      };

      const res = await apiClient.createEvent(payload as any);
      if (res.success) {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              {t('create_event.success')}
            </div>
          ),
          description: t('create_event.success_desc'),
          className: 'border-green-200 bg-green-50',
          duration: 4000
        });
        navigate('/');
      } else {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              {t('create_event.failed')}
            </div>
          ),
          description: res.error || t('create_event.failed_desc'),
          className: 'border-red-200 bg-red-50',
          duration: 5000
        });
      }
    } catch (e: any) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            {t('create_event.failed')}
          </div>
        ),
        description: e?.message || t('create_event.failed_desc'),
        className: 'border-red-200 bg-red-50',
        duration: 5000
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          size="sm"
          className="bg-white/80 hover:bg-white border-gray-300 text-gray-700 hover:text-gray-900 shadow-lg backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        <CreateEventForm onSubmit={handleSubmit} onCancel={() => navigate('/')} />
      </div>
    </div>
  );
};

export default CreateEventPage;
