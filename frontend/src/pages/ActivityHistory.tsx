import { useState, useEffect } from 'react';
import { Calendar, MapPin, ArrowLeft, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { EventStatusType, getEventStatusLabel, getEventStatusColor } from '@/types/event';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const ActivityHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserHistory = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const res = await apiClient.getUserRegistrations({ includeCanceled: true });
        if (res.success) {
          const data = (res.data as any);
          const registrations = data.registrations || [];

          // Transform registrations to include event data
          const userEvents = registrations.map((reg: any) => {
            const eventId = reg.event?.id || reg.event?._id || reg.eventId || reg._id;
            console.log('Registration data:', reg);
            console.log('Event ID extracted:', eventId);
            return {
              id: eventId,
              eventName: reg.event?.eventName || 'Unknown Event',
              eventDate: reg.event?.eventDate,
              location: reg.event?.location || reg.event?.venue,
              status: reg.event?.status || reg.status,
              capacity: reg.event?.capacity || { maxParticipants: 0, currentParticipants: 0 },
              // User registration specific data
              userRegistration: {
                playerId: reg.playerId,
                status: reg.status,
                startTime: reg.startTime,
                endTime: reg.endTime,
                registrationTime: reg.registrationTime,
                userType: reg.userType
              }
            };
          });

          // Sort by registration time (newest first)
          userEvents.sort((a: any, b: any) =>
            new Date(b.userRegistration.registrationTime).getTime() - new Date(a.userRegistration.registrationTime).getTime()
          );

          setUserRegistrations(userEvents);
        } else {
          toast({
            title: t('history.fetch_failed'),
            description: res.error,
            variant: 'destructive'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
          title: t('common.error'),
          description: errorMessage || t('history.fetch_error'),
          variant: 'destructive'
        });
      }
      setLoading(false);
    };

    fetchUserHistory();
  }, [user, toast, t]);

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 p-4 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t('nav.back_home')}
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                {t('activity.title')}
              </h1>
            </div>
            <p className="text-lg text-gray-600 mb-2">
              {t('activity.subtitle')}
            </p>
            <p className="text-sm text-gray-500">
              {t('activity.total', { count: userRegistrations.length })}
            </p>
          </div>
        </div>

        {/* Activity Content */}
        {userRegistrations.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-dashed border-2 border-gray-300">
            <CardContent className="text-center py-16">
              <Activity className="w-16 h-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {t('activity.empty_title')}
              </h3>
              <p className="text-gray-500 mb-6">
                {t('activity.empty_desc')}
              </p>
              <Link to="/">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {t('activity.browse_events')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRegistrations.map((reg: any) => (
              <Card
                key={reg.id}
                className="group relative overflow-hidden border border-gray-200 bg-white hover:shadow-xl transition-all duration-300"
              >
                {/* Status Badge - Top Right */}
                <div className="absolute top-0 right-0 z-10">
                  <Badge className={`rounded-none rounded-bl-lg px-3 py-1 font-medium text-xs shadow-md ${getEventStatusColor(reg.status as EventStatusType)}`}>
                    {getEventStatusLabel(reg.status as EventStatusType, t)}
                  </Badge>
                </div>


                {/* Header Section */}
                <div className={`px-6 py-4 border-b border-gray-100 ${
                  reg.status === 'completed'
                    ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-50'
                    : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-50'
                }`}>
                  <h3 className="font-bold text-xl text-gray-800 mb-2 pr-20">
                    {reg.eventName}
                  </h3>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium">{reg.eventDate}</span>
                  </div>
                </div>

                {/* Content Section */}
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        reg.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <MapPin className={`w-4 h-4 ${
                          reg.status === 'completed' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">{t('history.location')}</p>
                        <p className="text-gray-800 font-medium">{reg.location}</p>
                      </div>
                    </div>

                    {/* Your Play Time */}
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        reg.status === 'completed' ? 'bg-purple-100' : 'bg-gray-200'
                      }`}>
                        <Calendar className={`w-4 h-4 ${
                          reg.status === 'completed' ? 'text-purple-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">{t('history.your_play_time')}</p>
                        <p className="text-gray-800 font-medium">
                          {reg.userRegistration.startTime || '-'} - {reg.userRegistration.endTime || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 space-y-3">
                      <Link to={`/events/${reg.id}`} className="block">
                        <Button
                          className="w-full shadow-md hover:shadow-lg transition-all duration-200 text-white bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          {t('history.view_details')}
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

export default ActivityHistory;