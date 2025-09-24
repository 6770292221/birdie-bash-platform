import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const PaymentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [eventDetail, setEventDetail] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [payableIds, setPayableIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.getEvents({ limit: 50, offset: 0 });
      if (res.success) {
        const list = (res.data as any).events || (res.data as any) || [];
        setEvents(list);
        if (user && list.length) {
          const checks = await Promise.all(
            list.map(async (e: any) => {
              const r = await apiClient.getPlayers(e.id, { status: 'registered', limit: 200, offset: 0 });
              const mine = r.success ? ((r.data as any).players || []).some((p: any) => p.userId === user.id) : false;
              return mine ? e.id : null;
            })
          );
          const ids = checks.filter(Boolean) as string[];
          setPayableIds(ids);
          if (ids.length > 0) setEventId(ids[0]);
          else if (list.length > 0) setEventId(list[0].id);
        } else if (list.length > 0) setEventId(list[0].id);
      } else {
        toast({ title: 'โหลดรายการอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!eventId) { setEventDetail(null); setPlayers([]); return; }
      const [dRes, pRes] = await Promise.all([
        apiClient.getEvent(eventId),
        apiClient.getPlayers(eventId, { status: 'registered', limit: 200, offset: 0 }),
      ]);
      if (dRes.success) setEventDetail((dRes.data as any).event || dRes.data);
      setPlayers(pRes.success ? ((pRes.data as any).players || []) : []);
      
    };
    loadDetail();
  }, [eventId]);

  const myReg = useMemo(() => {
    if (!user) return null;
    return players.find((p: any) => p.userId === user.id) || null;
  }, [players, user]);

  const amount = useMemo(() => {
    if (!eventDetail) return 0;
    // Mock: court cost per current participant + shuttle per person
    const toMs = (t?: string) => { if (!t) return NaN; return new Date(`2000-01-01T${t}`).getTime(); };
    const courtHours = Array.isArray(eventDetail.courts)
      ? eventDetail.courts.reduce((acc: number, c: any) => {
          const s = toMs(c.startTime), e = toMs(c.endTime);
          const h = !Number.isNaN(s) && !Number.isNaN(e) && e > s ? (e - s) / 3600000 : 0; return acc + h;
        }, 0)
      : 0;
    const totalCourtCost = (eventDetail.courtHourlyRate || 0) * courtHours;
    const divisor = eventDetail?.capacity?.currentParticipants || eventDetail?.capacity?.maxParticipants || 1;
    const perCourt = totalCourtCost / divisor;
    const shuttle = Number(eventDetail.shuttlecockPrice || 0);
    return Math.round((perCourt + shuttle) * 100) / 100;
  }, [eventDetail]);

  const qrPayload = useMemo(() => {
    if (!eventDetail || !myReg) return 'BIRDIE-BASH';
    return `BIRDIE|EV:${eventDetail.id}|U:${user?.id}|AMT:${amount.toFixed(2)}`;
  }, [eventDetail, myReg, user, amount]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">กรุณาล็อกอิน</div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle className="text-xl">จ่ายเงิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Select event */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอีเวนต์" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.eventName} — {e.eventDate}{payableIds.includes(e.id) ? '' : ' (ไม่มีรายการของคุณ)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {eventDetail && (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">วันที่ {eventDetail.eventDate}</Badge>
                  <Badge variant="outline">ผู้เข้าร่วม {eventDetail?.capacity?.currentParticipants ?? '-'} / {eventDetail?.capacity?.maxParticipants ?? '-'}</Badge>
                </div>
                {!myReg ? (
                  <div className="text-gray-600">คุณยังไม่ได้ลงทะเบียนในอีเวนต์นี้</div>
                ) : (
                  <div className="space-y-3">
                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">รายการที่ต้องชำระ (1 รายการ)</div>
                            <div className="text-xs text-gray-500">ช่วงเวลา {myReg.startTime || '-'} - {myReg.endTime || '-'}</div>
                          </div>
                          <div className="text-2xl font-bold text-indigo-700">฿{amount.toFixed(2)}</div>
                        </div>
                        <div className="mt-3 text-sm text-gray-700 space-y-1">
                          <div className="flex justify-between"><span>ค่าสนาม</span><span>฿{(amount - Number(eventDetail?.shuttlecockPrice||0)).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>ค่าลูกขนไก่</span><span>฿{Number(eventDetail?.shuttlecockPrice||0).toFixed(2)}</span></div>
                          <div className="flex justify-between text-red-600"><span>ค่าปรับ</span><span>฿0.00</span></div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-700 mb-2">สแกน QR เพื่อชำระเงิน</div>
                        <div className="w-40 h-40 bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500 select-all">
                          {qrPayload}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentsPage;
