import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { Loader2, Calendar, MapPin, Users, Clock, DollarSign, Settings, UserPlus, Edit3, Trash2, Phone, Timer } from 'lucide-react';

interface Court { courtNumber: number; startTime: string; endTime: string }
interface EventApi {
  id: string;
  eventName: string;
  eventDate: string;
  location: string;
  status: string;
  capacity: { maxParticipants: number; currentParticipants: number; availableSlots?: number };
  shuttlecockPrice: number;
  courtHourlyRate: number;
  courts: Court[];
}

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
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
  const [overlayAction, setOverlayAction] = useState<'cancel' | 'register' | 'guest' | null>(null);

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
      } else {
        toast({ title: 'โหลดอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

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
        courts: Array.isArray(updates.courts)
          ? updates.courts.map((c: any) => ({ courtNumber: c.courtNumber, startTime: c.startTime, endTime: c.endTime }))
          : undefined,
      } as any;

      const res = await apiClient.updateEvent(id, payload);
      if (res.success) {
        toast({ title: 'บันทึกสำเร็จ' });
        setEditing(false);
        // refetch
        const d = await apiClient.getEvent(id);
        if (d.success) {
          const data: any = d.data;
          setEvent((data?.event || data) as EventApi);
        }
      } else {
        toast({ title: 'บันทึกไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'บันทึกไม่สำเร็จ', description: e?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('ยืนยันการลบอีเวนต์นี้?')) return;
    const res = await apiClient.deleteEvent(id);
    if (res.success) {
      toast({ title: 'ลบอีเวนต์สำเร็จ' });
      navigate('/');
    } else {
      toast({ title: 'ลบอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
    }
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isAddingGuest) return;
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
        toast({ title: 'เพิ่มผู้เล่นสำเร็จ' });
        setGuestForm({ name: '', phoneNumber: '', startTime: '', endTime: '' });
        await fetchPlayersFiltered();
        setTimeout(() => {
          setIsAddingGuest(false);
          window.location.reload();
        }, 1200);
      } else {
        toast({ title: 'เพิ่มผู้เล่นไม่สำเร็จ', description: res.error, variant: 'destructive' });
        setIsAddingGuest(false);
        setOverlayAction(null);
      }
    } catch (err: any) {
      toast({ title: 'เพิ่มผู้เล่นไม่สำเร็จ', description: err?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
      setIsAddingGuest(false);
      setOverlayAction(null);
    }
  };

  const cancelPlayer = async (playerId: string) => {
    if (!id) return;

    // Show loading state for specific player
    setCancelingPlayerId(playerId);
    setOverlayAction('cancel');

    const res = await apiClient.cancelPlayer(id, playerId);
    if (res.success) {
      toast({ title: 'ยกเลิกผู้เล่นสำเร็จ' });

      // Wait 2 seconds then refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      toast({ title: 'ยกเลิกผู้เล่นไม่สำเร็จ', description: res.error, variant: 'destructive' });
      setCancelingPlayerId(null);
      setOverlayAction(null);
    }
  };

  const registerAsMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!memberTime.startTime || !memberTime.endTime) {
      toast({
        title: 'กรุณาเลือกเวลา',
        description: 'โปรดเลือกเวลาเริ่มและเวลาสิ้นสุดก่อนลงทะเบียน',
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
        toast({ title: 'ลงทะเบียนสำเร็จ' });
        await fetchPlayersFiltered();
        setTimeout(() => {
          setIsRegisteringMember(false);
          window.location.reload();
        }, 1200);
      } else {
        toast({ title: 'ลงทะเบียนไม่สำเร็จ', description: res.error, variant: 'destructive' });
        setIsRegisteringMember(false);
        setOverlayAction(null);
      }
    } catch (err: any) {
      toast({ title: 'ลงทะเบียนไม่สำเร็จ', description: err?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
      setIsRegisteringMember(false);
      setOverlayAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">กำลังโหลด...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">ไม่พบอีเวนต์</div>
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
    ? 'กำลังยกเลิกการลงทะเบียน'
    : overlayAction === 'register'
      ? 'กำลังลงทะเบียนผู้เล่น'
      : overlayAction === 'guest'
        ? 'กำลังเพิ่มผู้เล่นแขก'
        : '';
  const overlaySubtitle = overlayAction === 'cancel'
    ? 'กรุณารอสักครู่...'
    : overlayAction === 'register'
      ? 'กำลังบันทึกข้อมูลการลงทะเบียน กรุณาอย่าปิดหน้าต่าง'
      : overlayAction === 'guest'
        ? 'กำลังบันทึกข้อมูลผู้เล่นแขก กรุณาอย่าปิดหน้าต่าง'
        : '';
  const overlayFootnote = overlayAction === 'cancel'
    ? 'หน้าจะรีเฟรชอัตโนมัติในอีกไม่ช้า'
    : overlayAction === 'register'
      ? 'ระบบจะอัปเดตรายชื่อให้อัตโนมัติทันทีที่เสร็จสิ้น'
      : overlayAction === 'guest'
        ? 'รายชื่อผู้เล่นจะอัปเดตให้คุณทันทีเมื่อเสร็จสิ้น'
        : '';

  const showOverlay = overlayAction !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 py-6 px-4 relative">
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
        {/* Header Card */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600" />
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
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
              {isAdmin && (
                <div className="flex gap-2">
                  <Button onClick={() => setEditing((v) => !v)} variant="outline" size="sm" className="bg-white/50 hover:bg-white/80">
                    <Edit3 className="w-4 h-4 mr-1" />
                    {editing ? 'ยกเลิก' : 'แก้ไข'}
                  </Button>
                  <Button onClick={handleDelete} variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    ลบ
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200/50">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <Badge variant="outline" className="bg-white/50 text-blue-700 border-blue-300">วันที่</Badge>
                </div>
                <div className="font-semibold text-gray-900">{event.eventDate}</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200/50">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <Badge variant="outline" className="bg-white/50 text-green-700 border-green-300">ผู้เข้าร่วม</Badge>
                </div>
                <div className="font-semibold text-gray-900">{event.capacity?.currentParticipants ?? '-'} / {event.capacity?.maxParticipants ?? '-'}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200/50">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <Badge variant="outline" className="bg-white/50 text-purple-700 border-purple-300">ค่าสนาม/ชม.</Badge>
                </div>
                <div className="font-semibold text-gray-900">฿{event.courtHourlyRate}</div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200/50">
                <div className="flex items-center justify-between mb-2">
                  <Settings className="w-5 h-5 text-amber-600" />
                  <Badge variant="outline" className="bg-white/50 text-amber-700 border-amber-300">ลูกขนไก่</Badge>
                </div>
                <div className="font-semibold text-gray-900">฿{event.shuttlecockPrice}</div>
              </div>
            </div>

            {/* Summary Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1">
                <Timer className="w-3 h-3 mr-1" />
                {totalCourtHours.toFixed(1)} ชั่วโมง
              </Badge>
              <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-3 py-1">
                <DollarSign className="w-3 h-3 mr-1" />
                ประมาณ ฿{estimatedCourtCost.toFixed(0)}
              </Badge>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1">
                <Users className="w-3 h-3 mr-1" />
                {perPlayer !== undefined ? `฿${perPlayer}/คน` : 'คำนวณไม่ได้'}
              </Badge>
              <Badge className={event.capacity?.waitlistEnabled
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1'
                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white px-3 py-1'
              }>
                {event.capacity?.waitlistEnabled ? '✅ เปิดสำรอง' : '❌ ปิดสำรอง'}
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
              กำหนดการสนาม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!event.courts || event.courts.length === 0) ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="text-gray-600">ไม่มีข้อมูลสนาม</div>
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
                          <div className="font-medium text-gray-900">สนาม #{c.courtNumber}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {fmtTime(c.startTime)} - {fmtTime(c.endTime)}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                        {calcHours(c.startTime, c.endTime)} ชั่วโมง
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
                จัดการผู้เล่น
              </CardTitle>
              <CardDescription>เพิ่มผู้เล่นแขกเข้าร่วมกิจกรรม</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-200/50">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  เพิ่มผู้เล่นแขกใหม่
                </h4>
                <form onSubmit={addGuest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gname" className="text-sm font-medium text-gray-700">ชื่อผู้เล่น</Label>
                      <Input
                        id="gname"
                        value={guestForm.name}
                        onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                        required
                        className="bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="กรุณาระบุชื่อผู้เล่น"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gphone" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        เบอร์โทรศัพท์
                      </Label>
                      <Input
                        id="gphone"
                        value={guestForm.phoneNumber}
                        onChange={(e) => setGuestForm({ ...guestForm, phoneNumber: e.target.value.replace(/\D/g, '').slice(0,10) })}
                        required
                        maxLength={10}
                        inputMode="numeric"
                        className="bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0812345678"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstart" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        เวลาเริ่มเล่น
                      </Label>
                      <Input
                        id="gstart"
                        value={guestForm.startTime}
                        onChange={(e) => setGuestForm({ ...guestForm, startTime: e.target.value })}
                        placeholder="18:30"
                        className="bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gend" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        เวลาสิ้นสุดเล่น
                      </Label>
                      <Input
                        id="gend"
                        value={guestForm.endTime}
                        onChange={(e) => setGuestForm({ ...guestForm, endTime: e.target.value })}
                        placeholder="20:00"
                        className="bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-medium py-2"
                    disabled={isAddingGuest}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    เพิ่มผู้เล่นแขก
                  </Button>
                </form>
              </div>

              {/* Players List */}
              <div className="space-y-6">
                {/* Registered Players */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">ผู้เล่นที่ลงทะเบียน</h4>
                    <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      {players.filter((p:any)=>p.status==='registered').length} คน
                    </Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='registered').length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-gray-200/50">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <div className="text-gray-600">ไม่มีผู้เล่นที่ลงทะเบียน</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {players.filter((p:any)=>p.status==='registered').map((p:any)=>(
                        <div key={p.playerId || p.id || p._id} className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-200/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                  {p.name || (p.userId ? memberNames[p.userId] : '') || 'ไม่ระบุชื่อ'}
                                  <Badge className={p.userType === 'member'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                                  }>
                                    {p.userType === 'member' ? 'สมาชิก' : 'แขก'}
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
                                <>ยกเลิก</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Waitlist Players */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">รายชื่อสำรอง</h4>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      {players.filter((p:any)=>p.status==='waitlist').length} คน
                    </Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='waitlist').length === 0 ? (
                    <div className="text-center py-8 bg-amber-50/50 rounded-xl border border-amber-200/50">
                      <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                      <div className="text-gray-600">ไม่มีรายชื่อสำรอง</div>
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
                                  {p.name || (p.userId ? memberNames[p.userId] : '') || 'ไม่ระบุชื่อ'}
                                  <Badge className={p.userType === 'member'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                                  }>
                                    {p.userType === 'member' ? 'สมาชิก' : 'แขก'}
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
                                <>ยกเลิก</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                ลงทะเบียนเข้าร่วมกิจกรรม
              </CardTitle>
              <CardDescription>ลงทะเบียนเข้าร่วมเล่นแบดมินตัน</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const mine = players.find((p:any) => p.userId && user && (p.userId === user.id) && p.status !== 'canceled');
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
                              คุณลงทะเบียนแล้ว
                              <Badge className={mine.status === 'registered'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }>
                                {mine.status === 'registered' ? '✅ ยืนยันแล้ว' : '⏳ รอสำรอง'}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              เวลาเล่น: {mine.startTime || '-'} - {mine.endTime || '-'}
                            </div>
                            <div className="text-xs text-gray-500">สถานะ: {mine.status === 'registered' ? 'ยืนยันการลงทะเบียน' : 'อยู่ในรายชื่อสำรอง'}</div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => cancelPlayer(mine.playerId)}
                          disabled={cancelingPlayerId === mine.playerId}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {cancelingPlayerId === mine.playerId ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ยกเลิก...
                            </>
                          ) : (
                            'ยกเลิก'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200/50">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-600" />
                      เลือกเวลาเล่น
                    </h4>
                    <form onSubmit={registerAsMember} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="mstart" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            เวลาเริ่มเล่น
                          </Label>
                          <TimePicker value={memberTime.startTime} onChange={(v)=>setMemberTime({...memberTime,startTime:v})} />
                        </div>
                        <div>
                          <Label htmlFor="mend" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            เวลาสิ้นสุดเล่น
                          </Label>
                          <TimePicker value={memberTime.endTime} onChange={(v)=>setMemberTime({...memberTime,endTime:v})} />
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
                            กำลังลงทะเบียน...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            ลงทะเบียน
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
                รายชื่อผู้เล่น
              </CardTitle>
              <CardDescription>ดูรายชื่อผู้เข้าร่วมกิจกรรม</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Registered Players */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">ผู้เล่นที่ลงทะเบียน</h4>
                    <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      {players.filter((p:any)=>p.status==='registered').length} คน
                    </Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='registered').length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-gray-200/50">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <div className="text-gray-600">ไม่มีผู้เล่นที่ลงทะเบียน</div>
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
                                {p.name || (p.userId ? memberNames[p.userId] : '') || 'ไม่ระบุชื่อ'}
                                <Badge className={p.userType === 'member'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-gray-100 text-gray-800 border border-gray-300'
                                }>
                                  {p.userType === 'member' ? 'สมาชิก' : 'แขก'}
                                </Badge>
                                {p.userId === user?.id && (
                                  <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                                    👤 คุณ
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

                {/* Waitlist Players */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">รายชื่อสำรอง</h4>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      {players.filter((p:any)=>p.status==='waitlist').length} คน
                    </Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='waitlist').length === 0 ? (
                    <div className="text-center py-8 bg-amber-50/50 rounded-xl border border-amber-200/50">
                      <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                      <div className="text-gray-600">ไม่มีรายชื่อสำรอง</div>
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
                                {p.name || (p.userId ? memberNames[p.userId] : '') || 'ไม่ระบุชื่อ'}
                                <Badge className={p.userType === 'member'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-gray-100 text-gray-800 border border-gray-300'
                                }>
                                  {p.userType === 'member' ? 'สมาชิก' : 'แขก'}
                                </Badge>
                                {p.userId === user?.id && (
                                  <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                                    👤 คุณ
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
