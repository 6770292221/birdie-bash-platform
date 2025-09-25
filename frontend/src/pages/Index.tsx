import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, MapPin, Users, Clock, Plus, LogOut, Shield, Menu, CreditCard, History, TrendingUp, X, Bell, ChevronDown, Loader2, Receipt, Sparkles, Trophy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthButtons from '@/components/AuthButtons';
import NotificationDropdown from '@/components/NotificationDropdown';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { EventStatusType, getEventStatusLabel, getEventStatusColor } from '@/types/event';
import { mockPaymentHistory } from '@/data/mockPaymentHistory';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const statusColorMap: Record<EventStatusType, string> = {
  upcoming: '#34d399',
  in_progress: '#6366f1',
  calculating: '#f59e0b',
  awaiting_payment: '#fb923c',
  completed: '#9ca3af',
  canceled: '#f87171',
};

const IndexContent = () => {
  const { t } = useLanguage();
  const { user, logout, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // All hooks must be called before any conditional returns
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [completedEvents, setCompletedEvents] = useState<any[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    eventName: '',
    date: '',
    status: ''
  });

  const fetchEvents = async () => {
    if (!user) return; // require auth
    setEventsLoading(true);

    // Build query parameters
    const params: any = { limit: 50, offset: 0 };
    if (searchFilters.eventName) params.eventName = searchFilters.eventName;
    if (searchFilters.date) params.date = searchFilters.date;
    if (searchFilters.status) params.status = searchFilters.status;

    const res = await apiClient.getEvents(params);
    if (res.success) {
      const data = (res.data as any);
      const allEvents = data.events || data;
      // Split events into active and completed/canceled
      const activeEvents = allEvents.filter((ev: any) => ev.status !== 'completed' && ev.status !== 'canceled');
      const finishedEvents = allEvents.filter((ev: any) => ev.status === 'completed' || ev.status === 'canceled');
      setEvents(activeEvents);
      setCompletedEvents(finishedEvents);
    } else {
      toast({ title: 'ดึงรายการอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
    }
    setEventsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchFilters]);

  const statusCounts = useMemo(() => {
    const base: Record<EventStatusType, number> = {
      upcoming: 0,
      in_progress: 0,
      calculating: 0,
      awaiting_payment: 0,
      completed: 0,
      canceled: 0,
    };

    [...events, ...completedEvents].forEach((ev) => {
      const rawStatus = (ev?.status || 'upcoming') as EventStatusType;
      const statusKey = base[rawStatus] !== undefined ? rawStatus : 'upcoming';
      base[statusKey] = (base[statusKey] ?? 0) + 1;
    });

    return base;
  }, [events, completedEvents]);

  const statusChartData = useMemo(
    () =>
      (Object.entries(statusCounts) as [EventStatusType, number][]) 
        .map(([status, value]) => ({
          status,
          label: getEventStatusLabel(status),
          value,
          fill: statusColorMap[status],
        }))
        .filter((item) => item.value > 0),
    [statusCounts]
  );

  const totalEventsCount = useMemo(
    () => statusChartData.reduce((sum, item) => sum + item.value, 0),
    [statusChartData]
  );

  const upcomingCount = statusCounts.upcoming ?? 0;
  const completedCount = statusCounts.completed ?? 0;
  const paymentHistoryCount = mockPaymentHistory.length;

  if (loading || eventsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-6">
          {/* Header grid to truly center the title */}
          <div className="grid grid-cols-3 items-center mb-4">
            <div className="justify-self-start" />

            <div className="justify-self-center text-center px-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                {t('app.title')}
              </h1>
            </div>

            <div className="justify-self-end flex items-center space-x-2">
              {user && <NotificationDropdown />}
              {user ? (
                <Button onClick={logout} variant="outline" size="sm" className="p-2 sm:px-3">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">ออกจากระบบ</span>
                </Button>
              ) : (
                <AuthButtons />
              )}
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500 shadow-lg">
                <img
                  src={user.profilePicture || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  {isAdmin && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </Badge>
                  )}
                  <span className="text-sm text-gray-600">สวัสดี, {user.name}</span>
                </div>

                {user.skillLevel && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${
                      user.skillLevel === 'P' ? 'bg-red-50 text-red-700 border-red-300' :
                      user.skillLevel === 'S' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                      user.skillLevel === 'BG' ? 'bg-green-50 text-green-700 border-green-300' :
                      'bg-yellow-50 text-yellow-700 border-yellow-300'
                    }`}
                  >
                    <i className="fas fa-medal mr-1"></i>
                    {user.skillLevel === 'P' ? 'Level P' :
                     user.skillLevel === 'S' ? 'Level S' :
                     user.skillLevel === 'BG' ? 'Level BG' : 'Level N'}
                  </Badge>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Guest Hero Section */}
        {!user && (
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white/80 via-blue-50/70 to-emerald-50/70 shadow-xl">
            <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-indigo-300/30 blur-[140px]" />

            <div className="relative grid gap-10 px-6 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-12">
              <div className="flex flex-col justify-center">
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  Birdie Bash Platform
                </span>
                <h2 className="mt-6 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  ยินดีต้อนรับสู่ Birdie Bash
                </h2>
                <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
                  แพลตฟอร์มจัดการอีเวนต์แบดมินตันครบวงจรสำหรับผู้จัดและผู้เล่น ดูแลการเปิดรับสมัคร การจัดการรายชื่อ และสรุปค่าใช้จ่ายได้ครบถ้วนในที่เดียว
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link to="/login">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                      เข้าสู่ระบบ
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="lg" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                      ลงทะเบียน
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-blue-100/70 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">สร้าง & จัดการอีเวนต์</p>
                        <p className="text-xs text-slate-500">ตั้งตาราง คอร์ท และจำนวนผู้เล่นได้ในไม่กี่ขั้นตอน</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-emerald-100/70 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">ลงทะเบียนง่าย</p>
                        <p className="text-xs text-slate-500">ผู้เล่นลงชื่อ รอคิว และติดตามสถานะได้แบบเรียลไทม์</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-purple-100/70 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">จัดการค่าใช้จ่าย</p>
                        <p className="text-xs text-slate-500">สรุปค่าสนาม ค่าลูก และสถานะการชำระอย่างเป็นระบบ</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-amber-100/70 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">จับคู่เล่นอย่างยุติธรรม</p>
                        <p className="text-xs text-slate-500">ระบบ Matching แบ่งระดับฝีมือ ให้ทุกเกมดวลกันอย่างสูสีและสนุก</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl ring-1 ring-white/10">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-teal-400 to-purple-400" />
                  <div className="p-6">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-emerald-200">
                      <span>Birdie Bash</span>
                      <span>Match Board</span>
                    </div>
                    <div className="mt-6 rounded-2xl bg-white/10 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span className="font-semibold">Friday Night Session</span>
                        <span>20:00 - 22:00</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-blue-500/10 px-3 py-4">
                          <p className="text-3xl font-bold">12</p>
                          <p className="text-xs text-slate-200">ผู้เล่นที่ยืนยัน</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-pink-500/10 px-3 py-4">
                          <p className="text-3xl font-bold">4</p>
                          <p className="text-xs text-slate-200">รายชื่อสำรอง</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-blue-200">Upcoming Highlight</p>
                      <p className="mt-2 text-sm font-semibold text-white">Weekend Badminton Meetup</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-200">
                        <span>คอร์ท 3 • 18:30 น.</span>
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-100">เปิดรับสมัคร</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Overview / Welcome */}
        {(user && isAdmin) ? (
          <Card className="mb-6 bg-white/70 backdrop-blur-sm">
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-gray-900">ภาพรวมอีเวนต์</CardTitle>
                <CardDescription className="text-gray-600">
                  ข้อมูลสรุปจากอีเวนต์ทั้งหมดในระบบ แยกตามสถานะการดำเนินงาน
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {eventsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>กำลังโหลดข้อมูลกราฟ...</span>
                  </div>
                ) : statusChartData.length > 0 ? (
                  <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8">
                    <div className="relative h-80 w-full lg:w-2/3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={statusChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="statusAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                              <stop offset="55%" stopColor="#8b5cf6" stopOpacity={0.55} />
                              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.25} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="5 5" stroke="rgba(148, 163, 184, 0.25)" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-15} height={50} tickMargin={10} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: number, _name, props) => [`${value} อีเวนต์`, props?.payload?.label]}
                            contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#4f46e5"
                            strokeWidth={4}
                            fill="url(#statusAreaGradient)"
                            activeDot={{ r: 7, strokeWidth: 3, stroke: '#fff' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3 mt-6 lg:mt-0">
                      {statusChartData.map((item) => (
                        <div key={item.status} className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${item.fill}22`, color: item.fill }}>
                              ●
                            </span>
                            <div>
                              <p className="font-medium text-gray-800">{item.label}</p>
                              <p className="text-xs text-gray-500">คิดเป็น {totalEventsCount ? Math.round((item.value / totalEventsCount) * 100) : 0}% ของทั้งหมด</p>
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <p className="font-medium mb-1">ยังไม่มีข้อมูลอีเวนต์สำหรับสร้างกราฟ</p>
                    <p className="text-sm text-gray-400">สร้างอีเวนต์แรกของคุณเพื่อดูสถิติสวย ๆ ที่นี่</p>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-600">อีเวนต์ทั้งหมด</p>
                    <p className="text-2xl font-semibold text-blue-700">{totalEventsCount}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-600">กำลังจะมาถึง</p>
                    <p className="text-2xl font-semibold text-emerald-700">{upcomingCount}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-600">เสร็จสิ้นแล้ว</p>
                    <p className="text-2xl font-semibold text-slate-700">{completedCount}</p>
                  </div>
                </div>
              </CardContent>
            </>
          </Card>
        ) : null}

        {/* Features Section (interactive) */}
        {user && isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* เพิ่มอีเวนต์ใหม่ (first) */}
          <Card
            className="bg-white/70 backdrop-blur-sm border-purple-200 cursor-pointer hover:shadow-md transition"
            onClick={() => {
              if (!isAdmin) { toast({ title: 'ต้องเป็นผู้ดูแลระบบ', description: 'เข้าถึงได้เฉพาะแอดมิน', variant: 'destructive' }); return; }
              navigate('/events/new');
            }}
            role="button"
          >
            <CardContent className="p-4 text-center">
              <Plus className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">เพิ่มอีเวนต์ใหม่</p>
              <p className="text-sm text-gray-600">สร้างอีเวนต์ใหม่</p>
            </CardContent>
          </Card>

          
          <Card
            className="bg-white/70 backdrop-blur-sm border-indigo-200 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/matching')}
            role="button"
          >
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">จับคู่ผู้เล่น</p>
              <p className="text-sm text-gray-600">เลือกอีเวนต์จับคู่ผู้เล่น</p>
            </CardContent>
          </Card>

          <Card
            className="bg-white/70 backdrop-blur-sm border-purple-200 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/calculate')}
            role="button"
          >
            <CardContent className="p-4 text-center">
              <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">คำนวณค่าใช้จ่าย</p>
              <p className="text-sm text-gray-600">เลือกอีเวนต์และคำนวณแบบ Mock</p>
            </CardContent>
          </Card>

          {/* ประวัติ (last) */}
          <Card
            className="bg-white/70 backdrop-blur-sm border-gray-200 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/history')}
            role="button"
          >
            <CardContent className="p-4 text-center">
              <History className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">ประวัติ</p>
              <p className="text-sm text-gray-600">
                ดูประวัติอีเวนต์ ({completedEvents.length})
              </p>
            </CardContent>
          </Card>
        </div>
        ) : user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-white/70 backdrop-blur-sm border-green-200 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/payments')} role="button">
              <CardContent className="p-4 text-center">
                <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">จ่ายเงิน</p>
                <p className="text-sm text-gray-600">เลือกอีเวนต์เพื่อชำระเงิน</p>
              </CardContent>
            </Card>

            <Card
              className="bg-white/70 backdrop-blur-sm border-amber-200 cursor-pointer hover:shadow-md transition"
              onClick={() => navigate('/payments/history')}
              role="button"
            >
              <CardContent className="p-4 text-center">
                <Receipt className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">ประวัติการจ่ายเงิน</p>
                <p className="text-sm text-gray-600">ดูการชำระล่าสุด ({paymentHistoryCount})</p>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-purple-200 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/history')} role="button">
              <CardContent className="p-4 text-center">
                <History className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">ประวัติกิจกรรม</p>
                <p className="text-sm text-gray-600">ดูประวัติอีเวนต์ ({completedEvents.length})</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Events List (requires login) */}
        {user && (
          <div id="events-list" className="mt-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Active Events
            </h3>

            {/* Search Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Event Name Search */}
                  <div className="space-y-2">
                    <Label htmlFor="event-name">ชื่อกิจกรรม</Label>
                    <Input
                      id="event-name"
                      type="text"
                      placeholder="ค้นหาชื่อกิจกรรม..."
                      value={searchFilters.eventName}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, eventName: e.target.value }))}
                    />
                  </div>

                  {/* Date Search */}
                  <div className="space-y-2">
                    <Label htmlFor="event-date">วันที่</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={searchFilters.date}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="event-status">สถานะ</Label>
                    <Select
                      value={searchFilters.status || "all"}
                      onValueChange={(value) => setSearchFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="upcoming">รอการชำระเงิน</SelectItem>
                        <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                        <SelectItem value="calculating">กำลังคำนวณ</SelectItem>
                        <SelectItem value="awaiting_payment">รอการชำระเงิน</SelectItem>
                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                        <SelectItem value="canceled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchFilters({ eventName: '', date: '', status: '' })}
                  >
                    <X className="w-4 h-4 mr-2" />
                    ล้างตัวกรอง
                  </Button>
                </div>
              </CardContent>
            </Card>
            {events.length === 0 ? (
              <p className="text-gray-600">No active events</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((ev: any) => (
                  <Card
                    key={ev.id}
                    className="group relative overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl bg-white transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Status Badge - Top Right */}
                    {ev.status && (
                      <div className="absolute top-0 right-0 z-10">
                        <Badge
                          className={`rounded-none rounded-bl-lg px-3 py-1 font-medium text-xs shadow-md ${getEventStatusColor(ev.status as EventStatusType)}`}
                        >
                          {getEventStatusLabel(ev.status as EventStatusType)}
                        </Badge>
                      </div>
                    )}

                    {/* Header Section */}
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                      <h3 className="font-bold text-xl text-gray-900 mb-2 pr-20">
                        {ev.eventName}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="font-medium">{ev.eventDate}</span>
                        </div>
                        {ev.courts && ev.courts.length > 0 && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <Clock className="w-4 h-4 mr-2 text-blue-500" />
                            <span className="font-medium">
                              {(() => {
                                const startTimes = ev.courts.map((court: any) => court.startTime);
                                const endTimes = ev.courts.map((court: any) => court.endTime);
                                const minStart = startTimes.reduce((min: string, time: string) => time < min ? time : min);
                                const maxEnd = endTimes.reduce((max: string, time: string) => time > max ? time : max);
                                return minStart === maxEnd ? minStart : `${minStart}-${maxEnd}`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Location */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 mb-1">สถานที่</p>
                            <p className="text-gray-900 font-medium">{ev.location}</p>
                          </div>
                        </div>

                        {/* Participants */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 mb-1">ผู้เข้าร่วม</p>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-900 font-medium">
                                {ev?.capacity?.currentParticipants ?? 0} / {ev?.capacity?.maxParticipants ?? 0}
                              </p>
                              {ev?.capacity && (
                                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(100, (ev.capacity.currentParticipants / ev.capacity.maxParticipants) * 100)}%`
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-2">
                          <Link to={`/events/${ev.id}`} className="block">
                            <Button
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                              size="sm"
                            >
                              <span className="flex items-center justify-center gap-2">
                                รายละเอียด
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

const Index = () => {
  return (
    <LanguageProvider>
      <IndexContent />
    </LanguageProvider>
  );
};

export default Index;
