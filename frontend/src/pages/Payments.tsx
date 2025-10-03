import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient, PlayerItem } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { QrCode, CreditCard, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

type PlayerPayment = {
  id: string;
  status: string; // PENDING | COMPLETED
  amount: number;
  currency: string;
  qrCodeUri?: string | null;
  eventId?: string;
  createdAt?: string;
  updatedAt?: string;
} | null;

const PaymentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [eventDetail, setEventDetail] = useState<any | null>(null);
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [payableIds, setPayableIds] = useState<string[]>([]);
  const [payment, setPayment] = useState<PlayerPayment>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Helper: determine if a registration belongs to the current user
  const isMyRegistration = useCallback((p: PlayerItem | any) => {
    if (!user || !p) return false;
    // 1) Strong match by userId (member registrations)
    if (p.userId && user.id && String(p.userId) === String(user.id)) return true;
    // 2) Email fallback
    if (p.email && user.email && String(p.email).toLowerCase() === String(user.email).toLowerCase()) return true;
    // 3) Phone fallback (normalize by removing non-digits)
    const normalizePhone = (v?: string) => (v ? v.replace(/\D/g, '') : '');
    if (p.phoneNumber && user.phoneNumber && normalizePhone(p.phoneNumber) === normalizePhone(user.phoneNumber)) return true;
    // 4) Name fallback (last resort)
    if (p.name && user.name && String(p.name).trim().toLowerCase() === String(user.name).trim().toLowerCase()) return true;
    return false;
  }, [user]);

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
              const mine = r.success ? ((r.data as any).players || []).some((p: any) => isMyRegistration(p)) : false;
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
  }, [user, isMyRegistration, toast]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!eventId) { setEventDetail(null); setPlayers([]); return; }
      const [dRes, pRes] = await Promise.all([
        apiClient.getEvent(eventId),
        apiClient.getPlayers(eventId, { limit: 200, offset: 0 }),
      ]);
      if (dRes.success) setEventDetail((dRes.data as any).event || dRes.data);
  setPlayers(pRes.success ? ((pRes.data as any).players || []) : []);
    };
    loadDetail();
  }, [eventId]);

  const [myReg, setMyReg] = useState<PlayerItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolveMyReg = async () => {
      if (!user) { if (!cancelled) setMyReg(null); return; }
      // Try find from current event's players list first
      const found = players.find((p) => isMyRegistration(p)) || null;
      if (found) { if (!cancelled) setMyReg(found); return; }
      // Fallback: query all registrations for this user and match by eventId
      const regsResp = await apiClient.getUserRegistrations();
      if (regsResp.success) {
        const regs = (regsResp.data as any)?.registrations || [];
        const match = regs.find((r: any) => r.eventId === eventId) || null;
        if (!cancelled) setMyReg(match);
      } else {
        if (!cancelled) setMyReg(null);
      }
    };
    resolveMyReg();
    return () => { cancelled = true; };
  }, [user, players, eventId, isMyRegistration]);

  // Fetch player's payment for the selected event
  useEffect(() => {
    const fetchPayment = async () => {
      if (!user || !myReg?.playerId || !eventId) { setPayment(null); console.log('No user or registration found', { user, myReg, eventId }); return; }
      setLoadingPayment(true);
      const resp = await apiClient.getPlayerPayments(myReg.playerId, { eventId });
      setLoadingPayment(false);
      if (resp.success) {
        const list = (resp.data as any)?.payments || [];
        setPayment(list.length ? list[0] : null);
      } else {
        setPayment(null);
      }
    };
    fetchPayment();
  }, [user, myReg, eventId]);

  const participantCount = useMemo(() => {
    const total = players.length;
    const capacity = (eventDetail as any)?.capacity || undefined;
    return capacity ? `${total} / ${capacity}` : `${total}`;
  }, [players, eventDetail]);

  const playTime = useMemo(() => {
    const courts = (eventDetail as any)?.courts || [];
    if (!courts.length) return '';
    // Use min start and max end across courts
    const starts = courts.map((c: any) => c.startTime).filter(Boolean);
    const ends = courts.map((c: any) => c.endTime).filter(Boolean);
    const start = starts.sort()[0];
    const end = ends.sort().slice(-1)[0];
    return start && end ? `${start} - ${end}` : '';
  }, [eventDetail]);

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
              {eventDetail?.eventName || 'อีเวนต์'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="font-medium">วันที่ {eventDetail?.eventDate || '-'}</div>
                <div className="text-gray-600">ผู้เข้าร่วม {participantCount}</div>
              </div>
              <Badge
                variant="outline"
                className={`${payment?.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}
              >
                <Clock className="w-3 h-3 mr-1" />
                {payment?.status === 'COMPLETED' ? 'ชำระแล้ว' : 'รอชำระ'}
              </Badge>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">ยอดที่ต้องชำระ</h3>
              {playTime && (
                <div className="text-sm text-gray-600 mb-4">ช่วงเวลา {playTime}</div>
              )}
              {loadingPayment ? (
                <div className="text-sm text-gray-500">กำลังโหลดรายการชำระเงิน…</div>
              ) : payment ? (
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>รวมทั้งหมด</span>
                  <span className="text-blue-600">฿{payment.amount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">ยังไม่มีรายการชำระเงินสำหรับอีเวนต์นี้</div>
              )}
            </div>

            {/* QR Code Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">สแกน QR เพื่อชำระเงิน</h4>
              <div className="flex flex-col items-center space-y-4">
                {payment?.qrCodeUri ? (
                  <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={payment.qrCodeUri} alt="PromptPay QR" className="object-contain w-full h-full" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-white border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-4">
                    <QrCode className="w-24 h-24 text-gray-400 mb-4" />
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">QR Code สำหรับชำระเงิน</p>
                      <p className="text-xs text-gray-500">ยังไม่มี QR Code สำหรับอีเวนต์นี้</p>
                    </div>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">ยอดที่ต้องชำระ</p>
                  <p className="text-2xl font-bold text-blue-600">฿{(payment?.amount ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  if (payment?.qrCodeUri) {
                    try {
                      await navigator.clipboard.writeText(payment.qrCodeUri);
                      toast({ title: 'คัดลอกแล้ว', description: 'คัดลอกลิงก์ QR เรียบร้อย' });
                    } catch (_e) {
                      toast({ title: 'คัดลอกไม่สำเร็จ', description: 'ไม่สามารถคัดลอกลิงก์ QR ได้', variant: 'destructive' });
                    }
                  } else {
                    toast({ title: 'ไม่มี QR', description: 'ยังไม่มีลิงก์ QR สำหรับอีเวนต์นี้', variant: 'destructive' });
                  }
                }}
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