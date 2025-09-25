import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Users, Clock, Plus, LogOut, Shield, Menu, CreditCard, History, Activity, TrendingUp, X, Bell, CheckCircle, ChevronDown } from 'lucide-react';
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/70 backdrop-blur-sm border-green-200 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/payments')} role="button">
              <CardContent className="p-4 text-center">
                <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">จ่ายเงิน</p>
                <p className="text-sm text-gray-600">เลือกอีเวนต์เพื่อชำระเงิน</p>
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
