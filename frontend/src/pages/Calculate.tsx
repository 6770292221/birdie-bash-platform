import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import PaymentManager from '@/components/PaymentManager';

const CalculatePage = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventDetail, setEventDetail] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !isAdmin) return;
      const res = await apiClient.getEvents({ limit: 50, offset: 0 });
      if (res.success) {
        const list = (res.data as any).events || (res.data as any) || [];
        setEvents(list);
        if (list.length > 0) setSelectedEventId(list[0].id);
      } else {
        toast({ title: 'โหลดรายการอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
    };
    fetch();
  }, [user, isAdmin]);

  const loadEventData = async (eventId: string) => {
    const [detail, reg, wait] = await Promise.all([
      apiClient.getEvent(eventId),
      apiClient.getPlayers(eventId, { status: 'registered', limit: 100, offset: 0 }),
      apiClient.getPlayers(eventId, { status: 'waitlist', limit: 100, offset: 0 }),
    ]);
    if (detail.success) setEventDetail((detail.data as any).event || detail.data);
    const regList = reg.success ? ((reg.data as any).players || (reg.data as any) || []) : [];
    const waitList = wait.success ? ((wait.data as any).players || (wait.data as any) || []) : [];
    setPlayers([...regList, ...waitList]);
  };

  const calculate = () => {
    if (!eventDetail) return;
    const registered = players.filter((p: any) => p.status === 'registered');
    if (registered.length === 0) { setBreakdown([]); return; }
    const toMs = (t?: string) => {
      if (!t) return NaN; const d = new Date(`2000-01-01T${t}`); return d.getTime();
    };
    const playerHours = registered.map((p: any) => {
      const s = toMs(p.startTime); const e = toMs(p.endTime);
      const h = !Number.isNaN(s) && !Number.isNaN(e) && e > s ? (e - s) / 3600000 : 0;
      return { id: p.playerId, name: p.name || 'ไม่ระบุชื่อ', hours: h };
    });
    const sumHours = playerHours.reduce((a, b) => a + b.hours, 0);
    const courtHours = Array.isArray(eventDetail.courts) ? eventDetail.courts.reduce((acc: number, c: any) => {
      const s = toMs(c.startTime); const e = toMs(c.endTime);
      const h = !Number.isNaN(s) && !Number.isNaN(e) && e > s ? (e - s) / 3600000 : 0; return acc + h;
    }, 0) : 0;
    const totalCourtCost = (eventDetail.courtHourlyRate || 0) * courtHours;
    const proportional = sumHours > 0; const equalShare = totalCourtCost / registered.length;
    const shuttlePerPlayer = Number(eventDetail.shuttlecockPrice || 0);
    const data = playerHours.map(ph => {
      const courtFee = proportional ? (ph.hours / sumHours) * totalCourtCost : equalShare;
      const shuttlecockFee = shuttlePerPlayer; const fine = 0;
      const total = courtFee + shuttlecockFee + fine;
      return { name: ph.name, playerId: ph.id, courtFee: Math.round(courtFee*100)/100, shuttlecockFee, fine, total: Math.round(total*100)/100 };
    });
    setBreakdown(data);
  };

  useEffect(() => {
    if (selectedEventId && isAdmin) loadEventData(selectedEventId);
  }, [selectedEventId, isAdmin]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card><CardContent className="p-6 text-gray-700">ต้องเป็นผู้ดูแลระบบ (Admin) เท่านั้น</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-xl">คำนวณค่าใช้จ่าย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอีเวนต์" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.eventName} — {ev.eventDate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={calculate}>คำนวณ</Button>
              </div>
            </div>

            {breakdown.length > 0 && eventDetail && (
              <PaymentManager
                event={{
                  id: eventDetail.id,
                  eventName: eventDetail.eventName,
                  eventDate: new Date(eventDetail.eventDate),
                  players: [],
                  courts: eventDetail.courts,
                  venue: eventDetail.location,
                  shuttlecockPrice: eventDetail.shuttlecockPrice,
                  courtHourlyRate: eventDetail.courtHourlyRate,
                  maxPlayers: eventDetail.capacity?.maxParticipants ?? 0,
                  status: eventDetail.status as any,
                } as any}
                onUpdateEvent={() => {}}
                costBreakdown={breakdown}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalculatePage;

