import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient, PlayerItem } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { QrCode, CreditCard, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

type PlayerPayment = {
  id: string;
  status: 'PENDING' | 'COMPLETED' | string;
  amount: number;
  currency: string;
  qrCodeUri?: string | null;
  eventId?: string;
  createdAt?: string;
  updatedAt?: string;
  playerId?: string;
  // Enriched
  eventName?: string;
  eventDate?: string;
} | null;

const PaymentsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId') || '';
  const urlPlayerId = searchParams.get('playerId') || '';

  type Capacity = number | { maxParticipants?: number; currentParticipants?: number; availableSlots?: number; waitlistEnabled?: boolean };
  type CourtInterval = { courtNumber?: number; startTime?: string; endTime?: string };
  type EventDetail = { id: string; eventName?: string; eventDate?: string; capacity?: Capacity; courts?: CourtInterval[] };
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [payment, setPayment] = useState<PlayerPayment>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const isGuestView = !authLoading && !user && !!urlEventId && !!urlPlayerId;

  // Logged-in user payments list and selection
  const [payments, setPayments] = useState<NonNullable<PlayerPayment>[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [participantTotal, setParticipantTotal] = useState<number | null>(null);
  const [loadingMyPayments, setLoadingMyPayments] = useState(false);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);

  // Logged-in: fetch only my payments across my events
  useEffect(() => {
    if (!user || isGuestView) return;
    let cancelled = false;
    const loadMyPayments = async () => {
      setLoadingMyPayments(true);
      // 1) Get my registrations (to know my playerIds)
      const regsResp = await apiClient.getUserRegistrations();
      if (!regsResp.success) {
        if (!cancelled) setPayments([]);
        if (!cancelled) setLoadingMyPayments(false);
        return;
      }
  const regs = ((regsResp.data?.registrations || []) as Array<PlayerItem & { eventId?: string }>).filter(r => !!r.playerId);
      // 2) Fetch payments per playerId
      const paymentLists = await Promise.all(
        regs.map(async (r) => {
          const pr = await apiClient.getPlayerPayments(r.playerId);
          const list = pr.success ? (pr.data?.payments || []) : [];
          // Attach playerId and eventId if missing
          return list.map((p) => ({ ...p, playerId: r.playerId, eventId: p.eventId ?? r.eventId }));
        })
      );
      let flat = paymentLists.flat();
      // 3) Enrich eventName/eventDate for display
      const eventIds = Array.from(new Set(flat.map((p) => p.eventId).filter(Boolean))) as string[];
      const eventInfoMap = new Map<string, { name?: string; date?: string }>();
      await Promise.all(
        eventIds.map(async (eid) => {
          const er = await apiClient.getEvent(eid);
          if (er.success) {
            const raw = er.data as unknown;
            let ed: unknown = raw;
            if (raw && typeof raw === 'object' && 'event' in (raw as Record<string, unknown>)) {
              ed = (raw as { event?: unknown }).event;
            }
            const name = (ed && typeof ed === 'object' && 'eventName' in (ed as Record<string, unknown>) && typeof (ed as Record<string, unknown>).eventName === 'string')
              ? (ed as { eventName: string }).eventName
              : undefined;
            const date = (ed && typeof ed === 'object' && 'eventDate' in (ed as Record<string, unknown>) && typeof (ed as Record<string, unknown>).eventDate === 'string')
              ? (ed as { eventDate: string }).eventDate
              : undefined;
            eventInfoMap.set(eid, { name, date });
          }
        })
      );
      flat = flat.map((p) => ({
        ...p,
        eventName: p.eventId ? eventInfoMap.get(p.eventId || '')?.name : undefined,
        eventDate: p.eventId ? eventInfoMap.get(p.eventId || '')?.date : undefined,
      }));
      // 4) Sort within status groups by createdAt asc
      const byDateAsc = (a?: string, b?: string) => {
        const ta = a ? Date.parse(a) : 0;
        const tb = b ? Date.parse(b) : 0;
        return ta - tb;
      };
      const pendings = flat.filter((p) => p.status === 'PENDING').sort((a, b) => byDateAsc(a.createdAt, b.createdAt));
      const completeds = flat.filter((p) => p.status === 'COMPLETED').sort((a, b) => byDateAsc(a.createdAt, b.createdAt));
      const ordered = [...pendings, ...completeds];
      if (!cancelled) {
        setPayments(ordered as NonNullable<PlayerPayment>[]);
        // Auto-select oldest pending, else none
        if (pendings.length > 0) {
          setActiveTab('PENDING');
          setSelectedPaymentId(pendings[0].id);
        } else {
          setActiveTab('PENDING');
          setSelectedPaymentId(null);
        }
        setLoadingMyPayments(false);
      }
    };
    loadMyPayments();
    return () => { cancelled = true; };
  }, [user, isGuestView]);

  // Guest: load event detail by URL; Logged-in: load detail for selected payment
  useEffect(() => {
    const loadDetail = async (eid: string | undefined | null) => {
      if (!eid) { setEventDetail(null); setLoadingEventDetail(false); return; }
      setLoadingEventDetail(true);
      const dRes = await apiClient.getEvent(eid);
      if (dRes.success) {
        const data = dRes.data as unknown;
        const detail = ((): EventDetail | null => {
          if (data && typeof data === 'object' && 'event' in (data as Record<string, unknown>)) {
            return (data as { event?: EventDetail }).event ?? null;
          }
          return (data as EventDetail) ?? null;
        })();
        setEventDetail(detail);
      } else {
        setEventDetail(null);
      }
      setLoadingEventDetail(false);
    };
    if (isGuestView) {
      setCurrentEventId(urlEventId || null);
      loadDetail(urlEventId);
    } else {
      const sel = payments.find((p) => p.id === selectedPaymentId) || null;
      const eid = sel?.eventId || null;
      setCurrentEventId(eid);
      loadDetail(eid);
    }
  }, [isGuestView, urlEventId, payments, selectedPaymentId]);

  // Selected payment entity (for logged-in), or fetched single payment (for guest)

  // Fetch payment for guest path, or bind selection for logged-in
  useEffect(() => {
    const fetchGuestPayment = async () => {
      if (!isGuestView) return;
      if (!urlPlayerId || !urlEventId) { setPayment(null); return; }
      setLoadingPayment(true);
      const resp = await apiClient.getPlayerPayments(urlPlayerId, { eventId: urlEventId });
      setLoadingPayment(false);
      if (resp.success) {
        const list = resp.data?.payments || [];
        setPayment(list.length ? list[0] : null);
      } else {
        setPayment(null);
      }
    };
    if (isGuestView) {
      fetchGuestPayment();
    } else {
      const sel = payments.find((p) => p.id === selectedPaymentId) || null;
      setPayment(sel || null);
    }
  }, [isGuestView, urlPlayerId, urlEventId, payments, selectedPaymentId]);

  // Logged-in: fetch participant count for the selected event (registered players)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentEventId || isGuestView) { if (!cancelled) setParticipantTotal(null); return; }
      const res = await apiClient.getPlayers(currentEventId, { status: 'registered', limit: 200, offset: 0 });
      if (!cancelled) {
        setParticipantTotal(res.success ? ((res.data?.players || []) as PlayerItem[]).length : null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [currentEventId, isGuestView]);

  const participantCount = useMemo(() => {
    const ev = (eventDetail as { capacity?: Capacity } | null) || null;
    const capacity = ev?.capacity;
    const maxParticipants = typeof capacity === 'number'
      ? capacity
      : typeof capacity === 'object' && capacity
        ? (capacity.maxParticipants as number | undefined)
        : undefined;
    const current = typeof participantTotal === 'number' ? participantTotal : undefined;
    if (typeof current === 'number' && typeof maxParticipants === 'number') return `${current} / ${maxParticipants}`;
    if (typeof current === 'number') return `${current}`;
    if (typeof maxParticipants === 'number') return `${maxParticipants}`;
    return '-';
  }, [eventDetail, participantTotal]);

  const playTime = useMemo(() => {
    const ev = (eventDetail as { courts?: CourtInterval[] } | null) || null;
    const courts: CourtInterval[] = ev?.courts ?? [];
    if (!courts.length) return '';
    // Use min start and max end across courts
    const starts = courts.map((c) => c.startTime).filter(Boolean) as string[];
    const ends = courts.map((c) => c.endTime).filter(Boolean) as string[];
    const start = starts.sort()[0];
    const end = ends.sort().slice(-1)[0];
    return start && end ? `${start} - ${end}` : '';
  }, [eventDetail]);

  // Unified page loader (auth + data)
  const showPageLoader = authLoading || (isGuestView ? (loadingPayment || loadingEventDetail) : (loadingMyPayments || loadingEventDetail));
  if (showPageLoader) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล…</p>
        </div>
      </div>
    );
  }

  // Allow guest access when eventId & playerId are provided via URL
  if (!user && (!urlEventId || !urlPlayerId)) {
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

      <div className={isGuestView ? 'max-w-2xl mx-auto space-y-6' : 'max-w-6xl mx-auto'}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">จ่ายเงิน</h1>
          <p className="text-gray-600">ชำระค่าใช้จ่ายสำหรับกิจกรรมแบดมินตัน</p>
        </div>

        {isGuestView ? (
          // Guest: single payment view
          <Card className="bg-white/90 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                {eventDetail?.eventName || 'อีเวนต์'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <div className="font-medium">วันที่ {eventDetail?.eventDate || '-'}</div>
                </div>
                <Badge
                  variant="outline"
                  className={`${payment?.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {payment?.status === 'COMPLETED' ? 'ชำระแล้ว' : 'รอชำระ'}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">ยอดที่ต้องชำระ</h3>
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
        ) : (
          // Logged-in: two-column layout with left panel
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Panel */}
            <div className="md:col-span-4">
              <Card className="bg-white/90 shadow-lg h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">รายการของฉัน</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Tabs */}
                  <div className="flex mb-3 rounded-lg bg-gray-100 p-1">
                    {(['PENDING', 'COMPLETED'] as const).map((tab) => (
                      <button
                        key={tab}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab === 'PENDING' ? 'รอชำระ' : 'ชำระแล้ว'}
                        <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                          {payments.filter((p) => p.status === tab).length}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* List */}
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {payments.filter((p) => p.status === activeTab).length === 0 ? (
                      <div className="text-sm text-gray-600 p-3">
                        {activeTab === 'PENDING' ? 'ไม่มีรายการรอชำระ' : 'ไม่มีรายการที่ชำระแล้ว'}
                      </div>
                    ) : (
                      payments.filter((p) => p.status === activeTab).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPaymentId(p.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-all ${selectedPaymentId === p.id ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900 truncate">{p.eventName || 'อีเวนต์'}</div>
                            <div className="text-sm font-semibold text-blue-600">฿{p.amount.toFixed(2)}</div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>{p.eventDate || '-'}</span>
                            <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Success message when all paid (no pendings) */}
                  {payments.filter((p) => p.status === 'PENDING').length === 0 && (
                    <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
                      เยี่ยม! คุณชำระเงินครบเรียบร้อยแล้ว หรือยังไม่มีรายการที่ต้องชำระ
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right content */}
            <div className="md:col-span-8">
              <Card className="bg-white/90 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                    {eventDetail?.eventName || 'อีเวนต์'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedPaymentId === null && payments.filter((p) => p.status === 'PENDING').length === 0 ? (
                    <div className="text-center py-16">
                      <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      </div>
                      <div className="text-xl font-semibold text-gray-900 mb-1">ชำระครบแล้ว</div>
                      <div className="text-gray-600">ไม่มีรายการรอชำระในขณะนี้</div>
                    </div>
                  ) : (
                    <>
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

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">ยอดที่ต้องชำระ</h3>
                        {loadingPayment ? (
                          <div className="text-sm text-gray-500">กำลังโหลดรายการชำระเงิน…</div>
                        ) : payment ? (
                          <div className="border-t pt-2 flex justify-between font-bold text-lg">
                            <span>รวมทั้งหมด</span>
                            <span className="text-blue-600">฿{payment.amount.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">ยังไม่มีรายการชำระเงิน</div>
                        )}
                      </div>

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
                                <p className="text-xs text-gray-500">ยังไม่มี QR Code สำหรับรายการนี้</p>
                              </div>
                            </div>
                          )}

                          <div className="text-center space-y-2">
                            <p className="text-sm text-gray-600">ยอดที่ต้องชำระ</p>
                            <p className="text-2xl font-bold text-blue-600">฿{(payment?.amount ?? 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

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
                              toast({ title: 'ไม่มี QR', description: 'ยังไม่มีลิงก์ QR สำหรับรายการนี้', variant: 'destructive' });
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

                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">วิธีการชำระเงิน</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• สแกน QR Code ด้วยแอปธนาคารของคุณ</li>
                          <li>• ตรวจสอบยอดเงินให้ถูกต้อง</li>
                          <li>• ทำการโอนเงินตามที่แสดง</li>
                          <li>• กดปุ่ม "ชำระเงินแล้ว" เมื่อทำรายการสำเร็จ</li>
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;