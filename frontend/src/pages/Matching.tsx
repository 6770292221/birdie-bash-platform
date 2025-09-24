import PlayerMatching from '@/components/PlayerMatching';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { apiClient } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const MatchingPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [eventObj, setEventObj] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const res = await apiClient.getEvents({ limit: 50, offset: 0 });
      if (res.success) {
        const list = (res.data as any).events || (res.data as any) || [];
        setEvents(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } else {
        toast({ title: 'โหลดรายการอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) { setEventObj(null); return; }
      const [detail, reg] = await Promise.all([
        apiClient.getEvent(selectedId),
        apiClient.getPlayers(selectedId, { status: 'registered', limit: 200, offset: 0 }),
      ]);
      if (!detail.success) { setEventObj(null); return; }
      const d: any = (detail.data as any).event || detail.data;
      const players = reg.success ? (((reg.data as any).players) || []) : [];
      const ev = {
        id: d.id,
        eventName: d.eventName,
        eventDate: d.eventDate,
        venue: d.location,
        courtHourlyRate: d.courtHourlyRate,
        shuttlecockPrice: d.shuttlecockPrice,
        courts: d.courts,
        players: players.map((p: any) => ({
          id: p.playerId,
          name: p.name || 'ไม่ระบุชื่อ',
          email: p.email || '',
          startTime: p.startTime || '19:00',
          endTime: p.endTime || '21:00',
          registrationTime: new Date(p.registrationTime || new Date()),
          status: 'registered',
        })),
      };
      setEventObj(ev);
    };
    loadDetail();
  }, [selectedId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-xl">จับคู่ผู้เล่น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอีเวนต์จากชื่อ" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.eventName} — {e.eventDate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {eventObj ? (
              <PlayerMatching event={eventObj} onUpdateEvent={() => {}} />
            ) : (
              <div className="text-gray-600 text-sm">เลือกอีเวนต์เพื่อเริ่มจับคู่ผู้เล่น</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchingPage;
