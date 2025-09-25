import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, CheckCircle, X, ArrowLeft, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { EventStatusType, getEventStatusLabel, getEventStatusColor } from '@/types/event';

const History = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [completedEvents, setCompletedEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      setLoading(true);

      const res = await apiClient.getEvents({ limit: 50, offset: 0 });
      if (res.success) {
        const data = (res.data as any);
        const allEvents = data.events || data;
        // Get only completed and canceled events
        const finishedEvents = allEvents.filter((ev: any) =>
          ev.status === 'completed' || ev.status === 'canceled'
        );
        // Sort by date (newest first)
        finishedEvents.sort((a: any, b: any) =>
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        );
        setCompletedEvents(finishedEvents);
      } else {
        toast({
          title: 'ดึงประวัติไม่สำเร็จ',
          description: res.error,
          variant: 'destructive'
        });
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user, toast]);

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">กำลังโหลดประวัติ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Button>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <HistoryIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                ประวัติอีเวนต์
              </h1>
            </div>
            <p className="text-lg text-gray-600 mb-2">
              ดูประวัติอีเวนต์ที่เสร็จสิ้นและยกเลิกแล้ว
            </p>
            <p className="text-sm text-gray-500">
              ทั้งหมด {completedEvents.length} อีเวนต์
            </p>
          </div>
        </div>

        {/* History Content */}
        {completedEvents.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-dashed border-2 border-gray-300">
            <CardContent className="text-center py-16">
              <HistoryIcon className="w-16 h-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                ยังไม่มีประวัติอีเวนต์
              </h3>
              <p className="text-gray-500 mb-6">
                เมื่อมีอีเวนต์ที่เสร็จสิ้นหรือยกเลิก จะแสดงที่นี่
              </p>
              <Link to="/">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  ดูอีเวนต์ปัจจุบัน
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedEvents.map((ev: any) => (
              <Card
                key={ev.id}
                className="group relative overflow-hidden border border-gray-200 bg-white hover:shadow-xl transition-all duration-300"
              >
                {/* Status Badge - Top Right */}
                <div className="absolute top-0 right-0 z-10">
                  <Badge className={`rounded-none rounded-bl-lg px-3 py-1 font-medium text-xs shadow-md ${getEventStatusColor(ev.status as EventStatusType)}`}>
                    {getEventStatusLabel(ev.status as EventStatusType)}
                  </Badge>
                </div>

                {/* Header Section */}
                <div className={`px-6 py-4 border-b border-gray-100 ${
                  ev.status === 'completed'
                    ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-50'
                    : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-50'
                }`}>
                  <h3 className="font-bold text-xl text-gray-800 mb-2 pr-20">
                    {ev.eventName}
                  </h3>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium">{ev.eventDate}</span>
                  </div>
                </div>

                {/* Content Section */}
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        ev.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <MapPin className={`w-4 h-4 ${
                          ev.status === 'completed' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">สถานที่</p>
                        <p className="text-gray-800 font-medium">{ev.location}</p>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        ev.status === 'completed' ? 'bg-blue-100' : 'bg-gray-200'
                      }`}>
                        <Users className={`w-4 h-4 ${
                          ev.status === 'completed' ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">ผู้เข้าร่วม</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-gray-800 font-medium">
                            {ev?.capacity?.currentParticipants ?? 0} / {ev?.capacity?.maxParticipants ?? 0}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              ev.status === 'completed'
                                ? 'text-green-600 border-green-300 bg-green-50'
                                : 'text-red-600 border-red-300 bg-red-50'
                            }`}
                          >
                            {ev.status === 'completed' ? 'สำเร็จ' : 'ยกเลิก'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <Link to={`/events/${ev.id}`} className="block">
                        <Button
                          className={`w-full shadow-md hover:shadow-lg transition-all duration-200 text-white ${
                            ev.status === 'completed'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          size="sm"
                        >
                          <span className="flex items-center justify-center gap-2">
                            ดูรายละเอียด
                            {ev.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
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
    </div>
  );
};

export default History;