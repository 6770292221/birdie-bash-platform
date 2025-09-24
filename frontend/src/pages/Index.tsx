import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Users, Clock, Plus, LogOut, Shield, Menu, CreditCard, History, Activity, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AuthButtons from '@/components/AuthButtons';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const IndexContent = () => {
  const { t } = useLanguage();
  const { user, logout, isAdmin, loading } = useAuth();
  const { toast } = useToast();

  // All hooks must be called before any conditional returns
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

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
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
            </div>

            <div className="text-center flex-1 px-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                {t('app.title')}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
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
              ยินดีต้อนรับสู่ Badminton Event Manager
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
                    สมัครสมาชิก
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-blue-800">ดูอีเวนต์</p>
                    <p className="text-sm text-blue-600">ดูอีเวนต์ที่กำลังจะมา</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">ลงทะเบียน</p>
                    <p className="text-sm text-green-600">ลงทะเบียนเข้าร่วมอีเวนต์</p>
                  </CardContent>
                </Card>

                {isAdmin && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="font-semibold text-purple-800">จัดการ</p>
                      <p className="text-sm text-purple-600">จัดการอีเวนต์และผู้เล่น</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/70 backdrop-blur-sm border-blue-200">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">การจัดการอีเวนต์</p>
              <p className="text-sm text-gray-600">สร้างและจัดการอีเวนต์แบดมินตัน</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-green-200">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">ระบบลงทะเบียน</p>
              <p className="text-sm text-gray-600">ลงทะเบียนผู้เล่นและจัดการรายชื่อ</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-purple-200">
            <CardContent className="p-4 text-center">
              <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">คำนวณค่าใช้จ่าย</p>
              <p className="text-sm text-gray-600">แบ่งค่าสนามและค่าลูกขนไก่อัตโนมัติ</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-orange-200">
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">ติดตามสถิติ</p>
              <p className="text-sm text-gray-600">ดูประวัติการเล่นและสถิติ</p>
            </CardContent>
          </Card>
        </div>
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