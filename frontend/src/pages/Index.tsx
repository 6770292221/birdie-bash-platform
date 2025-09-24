import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Users, Clock, Plus, LogOut, Shield, Menu, CreditCard, History, Activity, TrendingUp, X, Bell, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthButtons from '@/components/AuthButtons';
import NotificationDropdown from '@/components/NotificationDropdown';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';

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
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return; // require auth
      setEventsLoading(true);
      const res = await apiClient.getEvents({ limit: 10, offset: 0 });
      if (res.success) {
        const data = (res.data as any);
        setEvents(data.events || data);
      } else {
        toast({ title: 'ดึงรายการอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
      setEventsLoading(false);
    };
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

          <p className="text-center text-lg sm:text-xl text-gray-600 mb-6">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Welcome Message */}
        <Card className="mb-6 bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ยินดีต้อนรับสู่ Birdie Bash
            </h2>
            <p className="text-gray-600 mb-4">
              ระบบจัดการแบดมินตันที่ครบครัน สำหรับการจัดการอีเวนต์ การลงทะเบียน และการคำนวณค่าใช้จ่าย
            </p>

            {!user ? (
              <div className="flex gap-3 justify-center">
                <Link to="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    เข้าสู่ระบบ
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline">
                    ลงทะเบียน
                  </Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

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
            onClick={() => toast({ title: 'เร็วๆ นี้', description: 'หน้าประวัติอีเวนต์กำลังพัฒนา' })}
            role="button"
          >
            <CardContent className="p-4 text-center">
              <History className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">ประวัติ</p>
              <p className="text-sm text-gray-600">ดูประวัติและอีเวนต์ที่ผ่านมา</p>
            </CardContent>
          </Card>
        </div>
        ) : user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/70 backdrop-blur-sm border-green-200 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/payments')} role="button">
              <CardContent className="p-4 text-center">
                <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">จ่ายเงิน</p>
                <p className="text-sm text-gray-600">เลือกอีเวนต์เพื่อชำระเงิน</p>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-purple-200 cursor-pointer hover:shadow-md transition" onClick={() => toast({ title: 'เร็วๆ นี้', description: 'หน้าประวัติกิจกรรมกำลังพัฒนา' })} role="button">
              <CardContent className="p-4 text-center">
                <History className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">ประวัติกิจกรรม</p>
                <p className="text-sm text-gray-600">ดูประวัติการเข้าร่วม</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Events List (requires login) */}
        {user && (
          <div id="events-list" className="mt-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">อีเวนต์ล่าสุด</h3>
            {events.length === 0 ? (
              <p className="text-gray-600">ยังไม่มีอีเวนต์</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map((ev: any) => (
                  <Card
                    key={ev.id}
                    className="relative overflow-hidden border-0 shadow-lg bg-white/90 backdrop-blur-sm"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500" />
                    <CardContent className="p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold text-gray-900 text-lg truncate pr-2">{ev.eventName}</p>
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p>วันที่: {ev.eventDate}</p>
                        <p>สถานที่: {ev.location}</p>
                        <p>
                          ผู้เข้าร่วม: {ev?.capacity?.currentParticipants ?? '-'} / {ev?.capacity?.maxParticipants ?? '-'}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Link to={`/events/${ev.id}`}>
                          <Button size="sm" variant="outline">รายละเอียด</Button>
                        </Link>

                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Activity & History Section (Admin-style for users) */}
        {user && !isAdmin && (
          <div className="mt-8 space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">กิจกรรมของคุณ</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    กิจกรรมล่าสุด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">ลงทะเบียนเข้าร่วม</p>
                        <p className="text-xs text-gray-600">Weekend Badminton Meetup</p>
                        <p className="text-xs text-gray-500">2 ชั่วโมงที่แล้ว</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-300">สำเร็จ</Badge>
                    </div>

                    <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">ชำระเงิน</p>
                        <p className="text-xs text-gray-600">฿170.00 - Friday Night Session</p>
                        <p className="text-xs text-gray-500">1 วันที่แล้ว</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">ชำระแล้ว</Badge>
                    </div>

                    <div className="flex items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">เข้าร่วมรายชื่อสำรอง</p>
                        <p className="text-xs text-gray-600">Saturday Morning Practice</p>
                        <p className="text-xs text-gray-500">3 วันที่แล้ว</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">รอคิว</Badge>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => toast({ title: 'เร็วๆ นี้', description: 'ประวัติกิจกรรมแบบละเอียดกำลังพัฒนา' })}>
                      ดูทั้งหมด
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    สถิติของคุณ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">อีเวนต์ที่เข้าร่วม</p>
                        <p className="text-xs text-gray-600">ทั้งหมด</p>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">12</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">ยอดชำระ</p>
                        <p className="text-xs text-gray-600">เดือนนี้</p>
                      </div>
                      <div className="text-2xl font-bold text-green-600">฿1,240</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">ชั่วโมงเล่น</p>
                        <p className="text-xs text-gray-600">รวมทั้งหมด</p>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">38</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">อันดับ</p>
                        <p className="text-xs text-gray-600">ผู้เล่นประจำ</p>
                      </div>
                      <div className="flex items-center">
                        <div className="text-2xl font-bold text-amber-600">#{user.skillLevel === 'P' ? '3' : user.skillLevel === 'S' ? '7' : '12'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment History */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                  ประวัติการชำระเงิน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Weekend Badminton Meetup</p>
                        <p className="text-xs text-gray-500">24 ก.ย. 2025 • 20:00-21:00</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">฿170.00</p>
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">ชำระแล้ว</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Friday Night Session</p>
                        <p className="text-xs text-gray-500">23 ก.ย. 2025 • 19:00-21:00</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">฿200.00</p>
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">ชำระแล้ว</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Saturday Morning Practice</p>
                        <p className="text-xs text-gray-500">22 ก.ย. 2025 • 09:00-11:00</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">฿150.00</p>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">รอชำระ</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800" onClick={() => navigate('/payments')}>
                    ดูประวัติทั้งหมด
                  </Button>
                </div>
              </CardContent>
            </Card>
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
