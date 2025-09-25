import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CreateEventForm from '@/components/CreateEventForm';
import { apiClient } from '@/utils/api';
import { Card, CardContent } from '@/components/ui/card';

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
  absentPenaltyFee?: number;
  courts: Court[];
  status: string;
  createdBy?: string;
  players: any[];
}

const CreateEventPage = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        absentPenaltyFee: data.absentPenaltyFee || 0,
        courts: data.courts.map((c) => ({
          courtNumber: c.courtNumber,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      };

      const res = await apiClient.createEvent(payload as any);
      if (res.success) {
        toast({ title: 'สร้างอีเวนต์สำเร็จ', description: 'บันทึกข้อมูลเรียบร้อย' });
        navigate('/');
      } else {
        toast({ title: 'สร้างอีเวนต์ไม่สำเร็จ', description: res.error || 'เกิดข้อผิดพลาด', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'สร้างอีเวนต์ไม่สำเร็จ', description: e?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <CreateEventForm onSubmit={handleSubmit} onCancel={() => navigate('/')} />
      </div>
    </div>
  );
};

export default CreateEventPage;
