import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, X, CheckCircle, UserPlus, UserMinus, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'waitlist.promoted' | 'participant.cancelled' | 'capacity.slot.opened' | 'waiting.added' | 'payment.received' | 'event.created';
  title: string;
  message: string;
  timestamp: string;
  eventId?: string;
  playerId?: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  userType: 'user' | 'admin' | 'both';
}

const NotificationDropdown = () => {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock notifications based on the event data provided
  const mockNotifications = useMemo((): Notification[] => [
    // User notifications
    {
      id: '1',
      type: 'waitlist.promoted',
      title: 'ได้รับการยืนยันแล้ว!',
      message: 'คุณได้รับการยืนยันเข้าร่วมอีเวนต์ Weekend Badminton จากรายชื่อสำรอง',
      timestamp: '2025-09-24T13:24:52.036Z',
      eventId: '68d3ef5f1d0216a61ba9670b',
      playerId: '68d3f11d6a93401bcff2e8f3',
      isRead: false,
      priority: 'high',
      userType: 'user'
    },
    {
      id: '2',
      type: 'capacity.slot.opened',
      title: 'มีที่ว่างแล้ว!',
      message: 'อีเวนต์ Weekend Badminton มีที่ว่าง 1 ที่ สามารถลงทะเบียนได้ทันที',
      timestamp: '2025-09-24T13:24:51.933Z',
      eventId: '68d3ef5f1d0216a61ba9670b',
      isRead: false,
      priority: 'medium',
      userType: 'user'
    },
    {
      id: '3',
      type: 'waiting.added',
      title: 'เข้าสู่รายชื่อสำรอง',
      message: 'คุณถูกเพิ่มเข้ารายชื่อสำรองสำหรับอีเวนต์ Weekend Badminton',
      timestamp: '2025-09-24T13:24:45.129Z',
      eventId: '68d3ef5f1d0216a61ba9670b',
      playerId: '68d3f11d6a93401bcff2e8f3',
      isRead: true,
      priority: 'low',
      userType: 'user'
    },
    // Admin notifications
    {
      id: '4',
      type: 'participant.cancelled',
      title: 'ผู้เล่นยกเลิกการลงทะเบียน',
      message: 'New ยกเลิกการลงทะเบียนจากอีเวนต์ Weekend Badminton (มีที่ว่าง 1 ที่)',
      timestamp: '2025-09-24T13:24:51.799Z',
      eventId: '68d3ef5f1d0216a61ba9670b',
      playerId: '68d3ef9e6a93401bcff2e885',
      isRead: false,
      priority: 'medium',
      userType: 'admin'
    },
    {
      id: '5',
      type: 'waitlist.promoted',
      title: 'รายชื่อสำรองได้รับการยืนยัน',
      message: 'New ได้รับการยืนยันจากรายชื่อสำรองเข้าร่วมอีเวนต์ Weekend Badminton',
      timestamp: '2025-09-24T13:21:35.135Z',
      eventId: '68d3ef5f1d0216a61ba9670b',
      playerId: '68d3f0556a93401bcff2e8b0',
      isRead: false,
      priority: 'low',
      userType: 'admin'
    },
    {
      id: '6',
      type: 'payment.received',
      title: 'ได้รับการชำระเงินแล้ว',
      message: 'สมชาย ใจดี ชำระเงิน ฿170.00 สำหรับอีเวนต์ Weekend Badminton',
      timestamp: '2025-09-24T13:20:00.000Z',
      eventId: '68d3ef5f1d0216a61ba9670b',
      isRead: false,
      priority: 'low',
      userType: 'admin'
    }
  ], []);

  useEffect(() => {
    // Filter notifications based on user type
    const filtered = mockNotifications.filter(notif =>
      notif.userType === 'both' ||
      (isAdmin && notif.userType === 'admin') ||
      (!isAdmin && notif.userType === 'user')
    );
    setNotifications(filtered);
  }, [isAdmin, mockNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'waitlist.promoted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'participant.cancelled':
        return <UserMinus className="w-4 h-4 text-red-600" />;
      case 'capacity.slot.opened':
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'waiting.added':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'payment.received':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'เมื่อกี้นี้';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(minutes / 1440)} วันที่แล้ว`;
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="p-2 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">การแจ้งเตือน</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={markAllAsRead}
                  >
                    อ่านทั้งหมด
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-medium text-gray-900 ${
                            !notification.isRead ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {formatTime(notification.timestamp)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              notification.priority === 'high'
                                ? 'border-red-300 text-red-700'
                                : notification.priority === 'medium'
                                ? 'border-amber-300 text-amber-700'
                                : 'border-gray-300 text-gray-600'
                            }`}
                          >
                            {notification.priority === 'high' && '🔥'}
                            {notification.priority === 'medium' && '⚡'}
                            {notification.priority === 'low' && '📝'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <Button
                variant="ghost"
                className="w-full text-sm text-blue-600 hover:text-blue-800"
                onClick={() => {
                  // Navigate to full notifications page
                  setIsOpen(false);
                }}
              >
                ดูการแจ้งเตือนทั้งหมด
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;