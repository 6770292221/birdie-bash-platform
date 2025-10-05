import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ArrowLeft, CheckCircle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { mockNextPayoutNotice } from '@/data/mockPaymentHistory';
import { apiClient, PlayerItem } from '@/utils/api';

const PaymentHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  type RawPayment = { id: string; status: string; amount: number; currency: string; qrCodeUri?: string | null; eventId?: string; createdAt?: string; updatedAt?: string };
  type HistoryItem = { id: string; title: string; datetime: string; amount: string; status: 'ชำระแล้ว' };
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1) Get all registrations for this user to discover playerIds
        const regsResp = await apiClient.getUserRegistrations({ includeCanceled: true });
        const regs = (regsResp.success ? (regsResp.data?.registrations || []) : []) as Array<PlayerItem & { eventId?: string }>;
        const playerIds = Array.from(new Set(regs.map(r => r.playerId).filter(Boolean))) as string[];
        if (!playerIds.length) {
          if (!cancelled) setItems([]);
          return;
        }
        // 2) For each playerId, fetch completed payments
        const paymentResponses = await Promise.all(playerIds.map(pid => apiClient.getPlayerPayments(pid, { status: 'COMPLETED' })));
        const payments: RawPayment[] = paymentResponses
          .filter(r => r.success)
          .flatMap(r => (r.data?.payments || []) as RawPayment[])
          .filter(p => p.status === 'COMPLETED');

        if (!payments.length) {
          if (!cancelled) setItems([]);
          return;
        }

        // 3) Fetch event names for payments' eventIds
        const uniqueEventIds = Array.from(new Set(payments.map(p => p.eventId).filter(Boolean))) as string[];
        const eventMap: Record<string, { eventName?: string } | null> = {};
        await Promise.all(
          uniqueEventIds.map(async (eid) => {
            const er = await apiClient.getEvent(eid);
            if (er.success) {
              const isWithEvent = (d: unknown): d is { event?: { eventName?: string } } => !!d && typeof d === 'object' && 'event' in d;
              const data = er.data as unknown;
              const eventObj = isWithEvent(data) ? (data.event ?? undefined) : (data as { eventName?: string } | undefined);
              eventMap[eid] = { eventName: eventObj?.eventName };
            } else {
              eventMap[eid] = null;
            }
          })
        );

        // 4) Map to history items and sort desc by time
        const formatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
        const toDisplayTime = (iso?: string) => {
          try {
            return iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
          } catch {
            return iso || '';
          }
        };

        const sorted = [...payments].sort((a, b) => {
          const tb = new Date(b.updatedAt || b.createdAt || '').getTime();
          const ta = new Date(a.updatedAt || a.createdAt || '').getTime();
          return tb - ta; // newest first
        });

        const mapped: HistoryItem[] = sorted.map((p) => {
          const title = (p.eventId && eventMap[p.eventId]?.eventName) || 'กิจกรรม';
          const when = toDisplayTime(p.updatedAt || p.createdAt);
          const amount = formatter.format(Number(p.amount || 0));
          return { id: p.id, title, datetime: when, amount, status: 'ชำระแล้ว' as const };
        });

        if (!cancelled) setItems(mapped);
      } catch (e) {
        console.error('Failed to load payment history', e);
        if (!cancelled) setError('ไม่สามารถโหลดประวัติการจ่ายเงินได้');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('nav.back_home')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ประวัติการจ่ายเงิน</h1>
              <p className="text-sm text-gray-600">แสดงเฉพาะรายการที่ชำระเสร็จสิ้น (Completed)</p>
            </div>
          </div>
        </div>

        {/* Upcoming Payout Notice */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Info className="w-5 h-5 text-purple-600 mr-2" />
              {mockNextPayoutNotice.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-700">
            <p>{mockNextPayoutNotice.description}</p>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 w-fit">
              <Clock className="w-3 h-3 mr-1" />
              {mockNextPayoutNotice.eta}
            </Badge>
          </CardContent>
        </Card>

        {/* Payment History List (Completed only) */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-gray-900">
              รายการล่าสุด ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="text-sm text-gray-600">กำลังโหลดประวัติการจ่ายเงิน…</div>
            )}

            {!loading && error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="text-sm text-gray-600">ยังไม่มีประวัติการชำระเงินที่เสร็จสมบูรณ์</div>
            )}

            {!loading && !error && items.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-gray-50 rounded-lg border"
              >
                <div>
                  <p className="font-semibold text-gray-900">{entry.title}</p>
                  <p className="text-sm text-gray-600">{entry.datetime}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-900">{entry.amount}</span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {entry.status}
                  </Badge>
                </div>
              </div>
            ))}

            <div className="text-center text-sm text-gray-500">ข้อมูลแสดงจากระบบจริง (เฉพาะสถานะชำระแล้ว)</div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button onClick={() => navigate('/payments')} className="bg-purple-600 hover:bg-purple-700 text-white">
            ไปหน้าชำระเงิน
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
