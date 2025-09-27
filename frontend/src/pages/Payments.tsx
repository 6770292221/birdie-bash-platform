import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { QrCode, CreditCard, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

interface PaymentItem {
  id: string;
  eventName: string;
  eventDate: string;
  participantCount: string;
  playTime: string;
  courtFee: number;
  shuttlecockFee: number;
  fine: number;
  total: number;
  status: 'pending' | 'paid';
}

const PaymentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [eventDetail, setEventDetail] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [payableIds, setPayableIds] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);

  // Mock payment data - this would come from API after admin calculates
  const mockPaymentData: PaymentItem = {
    id: '1',
    eventName: 'Weekend Badminton Meetup — 2025-09-25',
    eventDate: '2025-09-25',
    participantCount: '4 / 4',
    playTime: '20:00 - 21:00',
    courtFee: 150.00,
    shuttlecockFee: 20.00,
    fine: 0.00,
    total: 170.00,
    status: 'pending'
  };

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

  const qrPayload = useMemo(() => {
    if (!mockPaymentData) return 'BIRDIE-BASH';
    return `BIRDIE|EV:${mockPaymentData.id}|U:68d3c9089c8bc62fcb712002|AMT:${mockPaymentData.total.toFixed(2)}`;
  }, [mockPaymentData]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">กรุณาล็อกอิน</div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4 relative">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          size="sm"
          className="bg-white/80 hover:bg-white border-gray-300 text-gray-700 hover:text-gray-900 shadow-lg backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('nav.back_home')}
        </Button>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">จ่ายเงิน</h1>
          <p className="text-gray-600">ชำระค่าใช้จ่ายสำหรับกิจกรรมแบดมินตัน</p>
        </div>

        {/* Event Selection */}
        <Card className="bg-white/90 shadow-lg">
          <CardContent className="p-6">
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="w-full">
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
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="bg-white/90 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
              {mockPaymentData.eventName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="font-medium">วันที่ {mockPaymentData.eventDate}</div>
                <div className="text-gray-600">ผู้เข้าร่วม {mockPaymentData.participantCount}</div>
              </div>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300"
              >
                <Clock className="w-3 h-3 mr-1" />
                รอชำระ
              </Badge>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">รายการที่ต้องชำระ (1 รายการ)</h3>
              <div className="text-sm text-gray-600 mb-4">ช่วงเวลา {mockPaymentData.playTime}</div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>ค่าสนาม</span>
                  <span>฿{mockPaymentData.courtFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าลูกขนไก่</span>
                  <span>฿{mockPaymentData.shuttlecockFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>ค่าปรับ</span>
                  <span>฿{mockPaymentData.fine.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>รวมทั้งหมด</span>
                  <span className="text-blue-600">฿{mockPaymentData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">สแกน QR เพื่อชำระเงิน</h4>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-64 h-64 bg-white border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-4">
                  <QrCode className="w-24 h-24 text-gray-400 mb-4" />
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">QR Code สำหรับชำระเงิน</p>
                    <p className="text-xs text-gray-500 break-all">{qrPayload}</p>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">ยอดที่ต้องชำระ</p>
                  <p className="text-2xl font-bold text-blue-600">฿{mockPaymentData.total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => toast({
                  title: 'คัดลอกแล้ว',
                  description: 'คัดลอกรหัสการชำระเรียบร้อย'
                })}
              >
                คัดลอกรหัส
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  toast({
                    title: 'ชำระเงินแล้ว',
                    description: 'ระบบจะตรวจสอบการชำระเงินของคุณ',
                    variant: 'default'
                  });
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                ชำระเงินแล้ว
              </Button>
            </div>

            {/* Payment Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">วิธีการชำระเงิน</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• สแกน QR Code ด้วยแอปธนาคารของคุณ</li>
                <li>• ตรวจสอบยอดเงินให้ถูกต้อง</li>
                <li>• ทำการโอนเงินตามที่แสดง</li>
                <li>• กดปุ่ม "ชำระเงินแล้ว" เมื่อทำรายการสำเร็จ</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentsPage;