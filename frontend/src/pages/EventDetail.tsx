import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TimePicker from '@/components/TimePicker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CreateEventForm from '@/components/CreateEventForm';
import LanguageToggle from '@/components/LanguageToggle';
import { Loader2, Calendar, MapPin, Users, Clock, DollarSign, Settings, UserPlus, Edit3, Trash2, Phone, Timer, ArrowLeft, AlertTriangle, CheckCircle, XCircle, CreditCard, Check } from 'lucide-react';

interface Court { courtNumber: number; startTime: string; endTime: string }
interface EventApi {
  id: string;
  eventName: string;
  eventDate: string;
  location: string;
  status: string;
  capacity: { maxParticipants: number; currentParticipants: number; availableSlots?: number, waitlistEnabled?: boolean };
  shuttlecockPrice: number;
  penaltyFee: number;
  courtHourlyRate: number;
  courts: Court[];
}

// Helper function to get available hours from court schedule
const getAvailableHours = (courts: Court[], isStartTime: boolean = true): number[] => {
  if (!courts || courts.length === 0) return [];

  const allHours = new Set<number>();

  courts.forEach(court => {
    if (court.startTime && court.endTime) {
      const startHour = parseInt(court.startTime.split(':')[0]);
      let endHour = parseInt(court.endTime.split(':')[0]);

      // รองรับกรณีเวลาข้ามวัน เช่น 23:00 -> 00:45
      if (Number.isFinite(startHour) && Number.isFinite(endHour) && endHour <= startHour) {
        endHour += 24;
      }

      if (isStartTime) {
        // For start time: include all hours from start to end-1
        for (let h = startHour; h < endHour; h++) {
          allHours.add((h + 24) % 24);
        }
      } else {
        // For end time: include all hours from start+1 to end
        for (let h = startHour + 1; h <= endHour; h++) {
          allHours.add((h + 24) % 24);
        }
      }
    }
  });

  return Array.from(allHours).sort((a, b) => a - b);
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [cancelingPlayerId, setCancelingPlayerId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventApi | null>(null);
  const [editing, setEditing] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [memberPhones, setMemberPhones] = useState<Record<string, string>>({});
  const [guestForm, setGuestForm] = useState({ name: '', phoneNumber: '', startTime: '', endTime: '' });
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [memberTime, setMemberTime] = useState({ startTime: '', endTime: '' });
  const [isRegisteringMember, setIsRegisteringMember] = useState(false);
  const [overlayAction, setOverlayAction] = useState<'cancel' | 'register' | 'guest' | 'payment' | null>(null);
  const [settlements, setSettlements] = useState<any>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      const res = await apiClient.getEvent(id);
      if (res.success) {
        // The API returns { event: {...} }
        const data: any = res.data;
        setEvent((data?.event || data) as EventApi);
        // fetch players list: only registered and waitlist
        await fetchPlayersFiltered();

        // fetch settlements if event is awaiting payment
        if ((data?.event || data)?.status === 'awaiting_payment') {
          await fetchSettlements();
        }
      } else {
        toast({ title: t('error.load_event_failed'), description: res.error, variant: 'destructive' });
      }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  const fetchSettlements = async () => {
    if (!id) return;
    setLoadingPayments(true);
    try {
      const res = await apiClient.getSettlements(id);
      if (res.success) {
        setSettlements(res.data);
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const markAsPaid = async (playerId: string) => {
    if (!id) return;
    setMarkingPaid(playerId);
    setOverlayAction('payment');

    try {
      const res = await apiClient.markPlayerAsPaid(id, playerId);
      if (res.success) {
        toast({ title: 'สำเร็จ', description: 'ทำการชำระเงินแล้ว' });
        // Refresh settlements data
        await fetchSettlements();
      } else {
        toast({ title: 'เกิดข้อผิดพลาด', description: res.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถอัปเดตสถานะการชำระเงินได้', variant: 'destructive' });
    } finally {
      setMarkingPaid(null);
      setOverlayAction(null);
    }
  };

  const fetchPlayersFiltered = async () => {
    if (!id) return;
    const [reg, wait] = await Promise.all([
      apiClient.getPlayers(id, { limit: 50, offset: 0, status: 'registered' }),
      apiClient.getPlayers(id, { limit: 50, offset: 0, status: 'waitlist' }),
    ]);
    const regList = reg.success ? ((reg.data as any)?.players || (reg.data as any) || []) : [];
    const waitList = wait.success ? ((wait.data as any)?.players || (wait.data as any) || []) : [];
    // merge unique by playerId
    const map = new Map<string, any>();
    [...regList, ...waitList].forEach((p: any) => {
      const key = p.playerId || p.id || p._id;
      if (key && !map.has(key)) map.set(key, p);
    });
    const list = Array.from(map.values());
    setPlayers(list);
    // Fetch missing member names
    const missingIds = Array.from(
      new Set(
        list
          .filter((p: any) => p.userType === 'member' && p.userId && !p.name && !memberNames[p.userId])
          .map((p: any) => p.userId as string)
      )
    );
    if (missingIds.length > 0) {
      missingIds.forEach(async (uid) => {
        const resp = await apiClient.getAuthUser(uid);
        if (resp.success && (resp.data as any)?.user) {
          const u = (resp.data as any).user;
          if (u.name) setMemberNames((prev) => ({ ...prev, [uid]: u.name }));
          if (u.phoneNumber) setMemberPhones((prev) => ({ ...prev, [uid]: u.phoneNumber }));
        }
      });
    }
  };


  const handleUpdate = async (_eventId: string, updates: any) => {
    if (!id) return;
    try {
      const payload = {
        eventName: updates.eventName,
        eventDate: updates.eventDate,
        location: updates.venue,
        capacity: {
          ...(updates.maxPlayers ? { maxParticipants: updates.maxPlayers } : {}),
          ...(typeof updates.waitlistEnabled === 'boolean' ? { waitlistEnabled: updates.waitlistEnabled } : {}),
        },
        shuttlecockPrice: updates.shuttlecockPrice,
        courtHourlyRate: updates.courtHourlyRate,
        penaltyFee: updates.penaltyFee,
        courts: Array.isArray(updates.courts)
          ? updates.courts.map((c: any) => ({ courtNumber: c.courtNumber, startTime: c.startTime, endTime: c.endTime }))
          : undefined,
      } as any;

      const res = await apiClient.updateEvent(id, payload);
      if (res.success) {
        toast({ title: t('success.saved') });
        setEditing(false);
        // refetch
        const d = await apiClient.getEvent(id);
        if (d.success) {
          const data: any = d.data;
          setEvent((data?.event || data) as EventApi);
        }
      } else {
        toast({ title: t('error.save_failed'), description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: t('error.save_failed'), description: e?.message || t('error.unknown'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm(t('confirm.delete_event'))) return;
    const res = await apiClient.deleteEvent(id);
    if (res.success) {
      toast({ title: t('success.event_deleted') });
      navigate('/');
    } else {
      toast({ title: t('error.delete_event_failed'), description: res.error, variant: 'destructive' });
    }
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isAddingGuest) return;
    if (!guestForm.startTime || !guestForm.endTime) {
      toast({
        title: t('error.time_required_title'),
        description: t('error.time_required_guest'),
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsAddingGuest(true);
      setOverlayAction('guest');
      const payload = {
        name: guestForm.name.trim(),
        phoneNumber: guestForm.phoneNumber.trim(),
        startTime: guestForm.startTime,
        endTime: guestForm.endTime,
      };
      const res = await apiClient.addGuest(id, payload);

      if (res.success) {
        // Update players list immediately after successful add guest
        await fetchPlayersFiltered();

        // Add 1-second delay for loading effect after updating state
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({ title: t('success.player_added') });
        setGuestForm({ name: '', phoneNumber: '', startTime: '', endTime: '' });
        setIsAddingGuest(false);
        setOverlayAction(null);
        // Refresh page immediately after loading completes
        window.location.reload();
      } else {
        // Add 1-second delay for loading effect
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({ title: t('error.add_player_failed'), description: res.error, variant: 'destructive' });
        setIsAddingGuest(false);
        setOverlayAction(null);
        // Refresh page after error
        window.location.reload();
      }
    } catch (err: any) {
      // Add 1-second delay for loading effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({ title: t('error.add_player_failed'), description: err?.message || t('error.unknown'), variant: 'destructive' });
      setIsAddingGuest(false);
      setOverlayAction(null);
      // Refresh page after error
      window.location.reload();
    }
  };

  const cancelPlayer = async (playerId: string) => {
    if (!id) return;

    // Show loading state for specific player
    setCancelingPlayerId(playerId);
    setOverlayAction('cancel');

    const res = await apiClient.cancelPlayer(id, playerId);

    if (res.success) {
      // Update players list immediately after successful cancellation
      await fetchPlayersFiltered();

      // Add 1-second delay for loading effect after updating state
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({ title: t('success.player_cancelled') });
      setCancelingPlayerId(null);
      setOverlayAction(null);
      // Refresh page immediately after loading completes
      window.location.reload();
    } else {
      // Add 2-second delay for loading effect
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({ title: t('error.cancel_player_failed'), description: res.error, variant: 'destructive' });
      setCancelingPlayerId(null);
      setOverlayAction(null);
      // Refresh page after error
      window.location.reload();
    }
  };

  const registerAsMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!memberTime.startTime || !memberTime.endTime) {
      toast({
        title: t('error.time_required_title'),
        description: t('error.time_required_member'),
        variant: 'destructive',
      });
      return;
    }
    setIsRegisteringMember(true);
    setOverlayAction('register');
    try {
      const res = await apiClient.registerMember(id, {
        startTime: memberTime.startTime,
        endTime: memberTime.endTime,
      });

      if (res.success) {
        // Update players list immediately after successful registration
        await fetchPlayersFiltered();

        // Add 1-second delay for loading effect after updating state
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({ title: t('success.registered') });
        setIsRegisteringMember(false);
        setOverlayAction(null);
        // Refresh page immediately after loading completes
        window.location.reload();
      } else {
        // Add 1-second delay for loading effect
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({ title: t('error.registration_failed'), description: res.error, variant: 'destructive' });
        setIsRegisteringMember(false);
        setOverlayAction(null);
        // Refresh page even on error to reset state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      toast({ title: t('error.registration_failed'), description: err?.message || t('error.unknown'), variant: 'destructive' });
      setIsRegisteringMember(false);
      setOverlayAction(null);
      // Refresh page even on error to reset state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">{t('event.loading')}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">{t('event.not_found')}</div>
      </div>
    );
  }

  const formProps = {
    eventName: event.eventName,
    eventDate: event.eventDate,
    venue: event.location,
    maxPlayers: event.capacity?.maxParticipants,
    waitlistEnabled: event.capacity?.waitlistEnabled,
    shuttlecockPrice: event.shuttlecockPrice,
    courtHourlyRate: event.courtHourlyRate,
    penaltyFee: event.penaltyFee,
    courts: event.courts,
  } as any;

  const fmtTime = (t?: string) => t || '-';
  const calcHours = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const s = new Date(`2000-01-01T${start}`).getTime();
    const e = new Date(`2000-01-01T${end}`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return '-';
    const h = (e - s) / (1000 * 60 * 60);
    return h.toFixed(1);
  };
  const totalCourtHours = Array.isArray(event.courts)
    ? event.courts.reduce((acc, c) => {
        const h = Number(calcHours(c.startTime, c.endTime));
        return acc + (Number.isFinite(h) ? h : 0);
      }, 0)
    : 0;
  const estimatedCourtCost = totalCourtHours * (event.courtHourlyRate || 0);
  const perPlayer = event.capacity?.maxParticipants
    ? Math.round(estimatedCourtCost / event.capacity.maxParticipants)
    : undefined;

  const overlayTitle = overlayAction === 'cancel'
    ? t('loading.cancelling_registration')
    : overlayAction === 'register'
      ? t('loading.registering_player')
      : overlayAction === 'guest'
        ? t('loading.adding_guest_player')
        : overlayAction === 'payment'
          ? 'กำลังอัปเดตสถานะการชำระเงิน'
          : '';
  const overlaySubtitle = overlayAction === 'cancel'
    ? t('loading.please_wait')
    : overlayAction === 'register'
      ? t('loading.saving_registration_data')
      : overlayAction === 'guest'
        ? t('loading.saving_guest_data')
        : overlayAction === 'payment'
          ? 'กำลังทำการอัปเดตข้อมูลการชำระเงิน'
          : '';
  const overlayFootnote = overlayAction === 'cancel'
    ? t('loading.page_will_refresh')
    : overlayAction === 'register'
      ? t('loading.list_will_update_automatically')
      : overlayAction === 'guest'
        ? t('loading.player_list_will_update')
        : overlayAction === 'payment'
          ? 'สถานะการชำระเงินจะถูกอัปเดตอัตโนมัติ'
          : '';

  const showOverlay = overlayAction !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 py-6 px-4 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

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
      {/* Beautiful loading overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center max-w-sm mx-4 border border-white/20">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin">
                  <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{overlayTitle}</h3>
            <p className="text-gray-600 text-sm mb-4">{overlaySubtitle}</p>
            <div className="w-full bg-gray-200/50 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-3">{overlayFootnote}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card with Language Switcher */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600" />
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  {event.eventName}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{event.location}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (event.status === 'calculating' || event.status === 'in_progress' || event.status === 'upcoming') && (
                  <div className="flex gap-2 ml-2">
                    {(event.status === 'calculating' || event.status === 'in_progress' || event.status === 'upcoming') && (
                      <Button onClick={() => setEditing((v) => !v)} variant="outline" size="sm" className="bg-white/50 hover:bg-white/80">
                        <Edit3 className="w-4 h-4 mr-1" />
                        {editing ? t('event.cancel') : t('event.edit')}
                      </Button>
                    )}
                    {event.status === 'upcoming' && (
                      <Button onClick={handleDelete} variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t('event.cancel')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200/50">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <Badge variant="outline" className="bg-white/50 text-blue-700 border-blue-300">{t('event.date')}</Badge>
                </div>
                <div className="font-semibold text-gray-900">{event.eventDate}</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200/50">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <Badge variant="outline" className="bg-white/50 text-green-700 border-green-300">{t('event.participants')}</Badge>
                </div>
                <div className="font-semibold text-gray-900">{event.capacity?.currentParticipants ?? '-'} / {event.capacity?.maxParticipants ?? '-'}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200/50">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <Badge variant="outline" className="bg-white/50 text-purple-700 border-purple-300">{t('event.court_rate')}</Badge>
                </div>
                <div className="font-semibold text-gray-900">฿{event.courtHourlyRate}</div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200/50">
                <div className="flex items-center justify-between mb-2">
                  <Settings className="w-5 h-5 text-amber-600" />
                  <Badge variant="outline" className="bg-white/50 text-amber-700 border-amber-300">{t('event.shuttlecock')}</Badge>
                </div>
                <div className="font-semibold text-gray-900">฿{event.shuttlecockPrice}</div>
              </div>
            </div>

            {/* Summary Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1">
                <Timer className="w-3 h-3 mr-1" />
                {totalCourtHours.toFixed(1)} {t('event.hours')}
              </Badge>
              <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-3 py-1">
                <DollarSign className="w-3 h-3 mr-1" />
                {t('badge.estimated')} ฿{estimatedCourtCost.toFixed(0)}
              </Badge>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1">
                <Users className="w-3 h-3 mr-1" />
                {perPlayer !== undefined ? `฿${perPlayer}/${t('badge.players')}` : t('badge.cannot_calculate')}
              </Badge>
              <Badge className={event.capacity?.waitlistEnabled
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1'
                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white px-3 py-1'
              }>
                {event.capacity?.waitlistEnabled ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('badge.waitlist_open')}
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    {t('badge.waitlist_closed')}
                  </>
                )}
              </Badge>
              <Badge className={event?.penaltyFee && event.penaltyFee > 0
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1'
              }>
                {event?.penaltyFee && event.penaltyFee > 0 ? (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    มีค่าปรับ ฿{event.penaltyFee}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    ไม่มีค่าปรับ
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Courts Schedule */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-blue-500 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              {t('event.court_schedule')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!event.courts || event.courts.length === 0) ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="text-gray-600">{t('event.no_courts')}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {event.courts.map((c, idx) => (
                  <div key={`${c.courtNumber}-${idx}`} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">#{c.courtNumber}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{t('event.court_number')}{c.courtNumber}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {fmtTime(c.startTime)} - {fmtTime(c.endTime)}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                        {calcHours(c.startTime, c.endTime)} {t('badge.hours')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && editing && (
          <CreateEventForm
            onSubmit={(data: any) => handleUpdate(event.id, data)}
            onCancel={() => setEditing(false)}
            editEvent={{ id: event.id, players: [], status: event.status, ...formProps } as any}
            onUpdateEvent={(eid: string, updates: any) => handleUpdate(eid, updates)}
          />
        )}

        {/* Admin: Manage Players */}
        {isAdmin && (
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                {t('event.manage_players')}
              </CardTitle>
              <CardDescription>{t('event.add_guest_player')}</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const restrictedStatuses = ['awaiting_payment','completed','canceled', 'calculating', 'in_progress'];
                const disabled = restrictedStatuses.includes(event.status);

                if (disabled) {
                  return (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200/50">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                          <UserPlus className="w-8 h-8 text-gray-400" />
                        </div>
                        <h4 className="font-semibold text-gray-700 mb-2">
                          {event.status === 'calculating' && t('guest.registration_closed_calculating')}
                          {event.status === 'awaiting_payment' && t('guest.registration_closed_awaiting_payment')}
                          {event.status === 'completed' && t('guest.registration_closed_completed')}
                          {event.status === 'canceled' && t('guest.registration_closed_canceled')}
                          {event.status === 'in_progress' && t('guest.registration_closed_in_progress')}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {event.status === 'calculating' && t('guest.registration_closed_calculating_desc')}
                          {event.status === 'awaiting_payment' && t('guest.registration_closed_awaiting_payment_desc')}
                          {event.status === 'completed' && t('guest.registration_closed_completed_desc')}
                          {event.status === 'canceled' && t('guest.registration_closed_canceled_desc')}
                          {event.status === 'in_progress' && t('guest.registration_closed_in_progress_desc')}
                        </p>
                      </div>
                    </div>
                  );
                }

                const startHours = getAvailableHours(event.courts || [], true);
                const endHours = getAvailableHours(event.courts || [], false);

                return (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-200/50">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  {t('event.add_new_guest')}
                </h4>
                <form onSubmit={addGuest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gname" className="text-sm font-medium text-gray-700">{t('event.player_name')}</Label>
                      <Input
                        id="gname"
                        value={guestForm.name}
                        onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                        required
                        className="bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder={t('placeholder.player_name')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gphone" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {t('event.phone_number')}
                      </Label>
                      <Input
                        id="gphone"
                        value={guestForm.phoneNumber}
                        onChange={(e) => setGuestForm({ ...guestForm, phoneNumber: e.target.value.replace(/\D/g, '').slice(0,10) })}
                        required
                        maxLength={10}
                        inputMode="numeric"
                        className="bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder={t('placeholder.phone_number')}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstart" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {t('event.start_time')}
                      </Label>
                      <TimePicker
                        value={guestForm.startTime}
                        onChange={(v) => setGuestForm({ ...guestForm, startTime: v })}
                        availableHours={startHours}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gend" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {t('event.end_time')}
                      </Label>
                      <TimePicker
                        value={guestForm.endTime}
                        onChange={(v) => setGuestForm({ ...guestForm, endTime: v })}
                        availableHours={endHours}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-medium py-2"
                    disabled={isAddingGuest}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('event.add_guest')}
                  </Button>
                </form>
                  </div>
                );
              })()}

              {/* Players List */}
              <div className="space-y-6">
                {/* Registered Players */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{t('event.registered_players')}</h4>
                    <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      {players.filter((p:any)=>p.status==='registered').length} {t('event.people')}
                    </Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='registered').length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-gray-200/50">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <div className="text-gray-600">{t('event.no_registered_players')}</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {players.filter((p:any)=>p.status==='registered').map((p:any)=>(
                        <div key={p.playerId || p.id || p._id} className={`rounded-xl p-4 border ${(() => {
                          const payment = settlements?.payments?.find((payment: any) => payment.playerId === (p.playerId || p.id || p._id));
                          return payment?.hasPenalty
                            ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-200/50"
                            : "bg-gradient-to-r from-green-50 to-teal-50 border-green-200/50";
                        })()}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(() => {
                                const payment = settlements?.payments?.find((payment: any) => payment.playerId === (p.playerId || p.id || p._id));
                                return payment?.hasPenalty
                                  ? "bg-gradient-to-r from-red-500 to-pink-500"
                                  : "bg-gradient-to-r from-green-500 to-teal-500";
                              })()}`}>
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                  {p.name || (p.userId ? memberNames[p.userId] : '') || t('user.no_name_display')}
                                  <Badge className={p.userType === 'member'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                                  }>
                                    {p.userType === 'member' ? t('user.member_badge') : t('user.guest_badge')}
                                  </Badge>
                                  {(() => {
                                    const payment = settlements?.payments?.find((payment: any) => payment.playerId === (p.playerId || p.id || p._id));
                                    return payment?.hasPenalty && (
                                      <Badge className="bg-red-100 text-red-800 border border-red-300">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        มีค่าปรับ
                                      </Badge>
                                    );
                                  })()}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <Phone className="w-3 h-3" />
                                  {p.phoneNumber || (p.userId ? memberPhones[p.userId] : '') || '-'}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {p.startTime || '-'} - {p.endTime || '-'}
                                </div>
                                {/* Payment Status for awaiting_payment events */}
                                {event.status === 'awaiting_payment' && settlements && (
                                  <div className="text-xs mt-1 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {(() => {
                                      const payment = settlements.payments?.find((payment: any) => payment.playerId === (p.playerId || p.id || p._id));
                                      if (payment?.status === 'paid') {
                                        return (
                                          <span className="text-green-600 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            จ่ายแล้ว ฿{payment.amount}
                                            {payment.hasPenalty && (
                                              <span className="text-red-600 ml-1">(รวมค่าปรับ ฿{payment.penaltyAmount})</span>
                                            )}
                                          </span>
                                        );
                                      } else {
                                        const textColor = payment?.hasPenalty ? "text-red-600" : "text-orange-600";
                                        return (
                                          <span className={`${textColor} flex items-center gap-1`}>
                                            <Clock className="w-3 h-3" />
                                            รอชำระ ฿{payment?.amount || 0}
                                            {payment?.hasPenalty && (
                                              <span className="text-red-600 ml-1">(รวมค่าปรับ ฿{payment.penaltyAmount})</span>
                                            )}
                                          </span>
                                        );
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {/* Mark as Paid button for awaiting_payment status - Guest only */}
                              {event.status === 'awaiting_payment' && settlements && p.userType === 'guest' && (() => {
                                const payment = settlements.payments?.find((payment: any) => payment.playerId === (p.playerId || p.id || p._id));
                                return payment?.status !== 'paid' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markAsPaid(p.playerId || p.id || p._id)}
                                    disabled={markingPaid === (p.playerId || p.id || p._id)}
                                    className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                                  >
                                    {markingPaid === (p.playerId || p.id || p._id) ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4 mr-1" />
                                    )}
                                    Mark Paid
                                  </Button>
                                );
                              })()}
                              {(event.status === 'upcoming' || event.status === 'in_progress') && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => cancelPlayer(p.playerId || p.id || p._id)}
                                  disabled={cancelingPlayerId === (p.playerId || p.id || p._id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  {cancelingPlayerId === (p.playerId || p.id || p._id) ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    t('event.cancel_registration')
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Waitlist Players - Hidden for awaiting_payment status */}
                {event.status !== 'awaiting_payment' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">{t('event.waitlist')}</h4>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        {players.filter((p:any)=>p.status==='waitlist').length} {t('event.people')}
                      </Badge>
                    </div>
                    {players.filter((p:any)=>p.status==='waitlist').length === 0 ? (
                      <div className="text-center py-8 bg-amber-50/50 rounded-xl border border-amber-200/50">
                        <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                        <div className="text-gray-600">{t('event.no_waitlist')}</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {players.filter((p:any)=>p.status==='waitlist').map((p:any)=>(
                          <div key={p.playerId || p.id || p._id} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                                  <Clock className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 flex items-center gap-2">
                                    {p.name || (p.userId ? memberNames[p.userId] : '') || t('user.no_name_display')}
                                    <Badge className={p.userType === 'member'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : 'bg-gray-100 text-gray-800 border border-gray-300'
                                    }>
                                      {p.userType === 'member' ? t('user.member_badge') : t('user.guest_badge')}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 flex items-center gap-2">
                                    <Phone className="w-3 h-3" />
                                    {p.phoneNumber || (p.userId ? memberPhones[p.userId] : '') || '-'}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    {p.startTime || '-'} - {p.endTime || '-'}
                                  </div>
                                </div>
                              </div>
                              {(event.status === 'upcoming' || event.status === 'in_progress') && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => cancelPlayer(p.playerId || p.id || p._id)}
                                  disabled={cancelingPlayerId === (p.playerId || p.id || p._id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  {cancelingPlayerId === (p.playerId || p.id || p._id) ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    t('event.cancel_registration')
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        

        {/* User Registration Section */}
        {user && !isAdmin && (
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                {t('event.register_to_join')}
              </CardTitle>
              <CardDescription>{t('event.register_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Check if registration is disabled due to event status
                const registrationDisabled = event.status === 'calculating' || event.status === 'awaiting_payment' || event.status === 'completed' || event.status === 'canceled' || event.status === 'in_progress';
                const mine = players.find((p:any) => p.userId && user && (p.userId === user.id) && p.status !== 'canceled');

                if (registrationDisabled && !mine) {
                  return (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200/50">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                          <UserPlus className="w-8 h-8 text-gray-400" />
                        </div>
                        <h4 className="font-semibold text-gray-700 mb-2">
                          {event.status === 'calculating' && t('user.registration_closed_calculating')}
                          {event.status === 'awaiting_payment' && t('user.registration_closed_awaiting_payment')}
                          {event.status === 'completed' && t('user.registration_closed_completed')}
                          {event.status === 'canceled' && t('user.registration_closed_canceled')}
                          {event.status === 'in_progress' && t('user.registration_closed_in_progress')}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {event.status === 'calculating' && t('user.registration_closed_calculating_desc')}
                          {event.status === 'awaiting_payment' && t('user.registration_closed_awaiting_payment_desc')}
                          {event.status === 'completed' && t('user.registration_closed_completed_desc')}
                          {event.status === 'canceled' && t('user.registration_closed_canceled_desc')}
                          {event.status === 'in_progress' && t('user.registration_closed_in_progress_desc')}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (mine) {
                  return (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {t('user.already_registered')}
                              <Badge className={mine.status === 'registered'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }>
                                {mine.status === 'registered' ? `✅ ${t('user.confirmed_status')}` : `⏳ ${t('user.waitlist_status')}`}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {t('user.play_time_display')}: {mine.startTime || '-'} - {mine.endTime || '-'}
                            </div>
                            <div className="text-xs text-gray-500">{t('user.status_display')}: {mine.status === 'registered' ? t('user.confirmed_registration') : t('user.on_waitlist')}</div>
                          </div>
                        </div>
                        {(event.status === 'upcoming' || event.status === 'in_progress') && (
                          <Button
                            variant="destructive"
                            onClick={() => cancelPlayer(mine.playerId)}
                            disabled={cancelingPlayerId === mine.playerId}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {cancelingPlayerId === mine.playerId ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('event.canceling')}
                              </>
                            ) : (
                              t('event.cancel')
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200/50">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-600" />
                      {t('user.select_play_time')}
                    </h4>
                    <form onSubmit={registerAsMember} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="mstart" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {t('event.start_time')}
                          </Label>
                          <TimePicker
                            value={memberTime.startTime}
                            onChange={(v)=>setMemberTime({...memberTime,startTime:v})}
                            availableHours={event?.courts ? getAvailableHours(event.courts, true) : undefined}
                          />
                        </div>
                        <div>
                          <Label htmlFor="mend" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {t('event.end_time')}
                          </Label>
                          <TimePicker
                            value={memberTime.endTime}
                            onChange={(v)=>setMemberTime({...memberTime,endTime:v})}
                            availableHours={event?.courts ? getAvailableHours(event.courts, false) : undefined}
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2"
                        disabled={isRegisteringMember}
                      >
                        {isRegisteringMember ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('event.registering')}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            {t('event.register')}
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* User View: Players List */}
        {user && !isAdmin && (
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                {t('user.player_list')}
              </CardTitle>
              <CardDescription>{t('user.view_participants')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Registered Players */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{t('event.registered_players')}</h4>
                    <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      {players.filter((p:any)=>p.status==='registered').length} {t('event.people')}
                    </Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='registered').length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-gray-200/50">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <div className="text-gray-600">{t('event.no_registered_players')}</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {players.filter((p:any)=>p.status==='registered').map((p:any)=>(
                        <div key={p.playerId || p.id || p._id} className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-200/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {p.name || (p.userId ? memberNames[p.userId] : '') || t('user.no_name_display')}
                                <Badge className={p.userType === 'member'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-gray-100 text-gray-800 border border-gray-300'
                                }>
                                  {p.userType === 'member' ? t('user.member_badge') : t('user.guest_badge')}
                                </Badge>
                                {p.userId === user?.id && (
                                  <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                                    👤 {t('user.you_badge')}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {p.phoneNumber || (p.userId ? memberPhones[p.userId] : '') || '-'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {p.startTime || '-'} - {p.endTime || '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Waitlist Players - Hidden for awaiting_payment status */}
                {event.status !== 'awaiting_payment' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">{t('event.waitlist')}</h4>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        {players.filter((p:any)=>p.status==='waitlist').length} {t('event.people')}
                      </Badge>
                    </div>
                    {players.filter((p:any)=>p.status==='waitlist').length === 0 ? (
                      <div className="text-center py-8 bg-amber-50/50 rounded-xl border border-amber-200/50">
                        <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                        <div className="text-gray-600">{t('event.no_waitlist')}</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {players.filter((p:any)=>p.status==='waitlist').map((p:any)=>(
                          <div key={p.playerId || p.id || p._id} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                  {p.name || (p.userId ? memberNames[p.userId] : '') || t('user.no_name_display')}
                                  <Badge className={p.userType === 'member'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                                  }>
                                    {p.userType === 'member' ? t('user.member_badge') : t('user.guest_badge')}
                                  </Badge>
                                  {p.userId === user?.id && (
                                    <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                                      👤 {t('user.you_badge')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <Phone className="w-3 h-3" />
                                  {p.phoneNumber || (p.userId ? memberPhones[p.userId] : '') || '-'}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {p.startTime || '-'} - {p.endTime || '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
