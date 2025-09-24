import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [event, setEvent] = useState<EventApi | null>(null);
  const [editing, setEditing] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [guestForm, setGuestForm] = useState({ name: '', phoneNumber: '', startTime: '20:00', endTime: '22:00' });
  const [memberTime, setMemberTime] = useState({ startTime: '19:00', endTime: '21:00' });

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
    setPlayers(Array.from(map.values()));
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
    if (!id) return;
    try {
      const payload = {
        name: guestForm.name.trim(),
        phoneNumber: guestForm.phoneNumber.trim(),
        startTime: guestForm.startTime,
        endTime: guestForm.endTime,
      };
      const res = await apiClient.addGuest(id, payload);
      if (res.success) {
        toast({ title: 'เพิ่มผู้เล่นสำเร็จ' });
        setGuestForm({ name: '', phoneNumber: '', startTime: '20:00', endTime: '22:00' });
        await fetchPlayersFiltered();
      } else {
        toast({ title: 'เพิ่มผู้เล่นไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'เพิ่มผู้เล่นไม่สำเร็จ', description: err?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const cancelPlayer = async (playerId: string) => {
    if (!id) return;
    const res = await apiClient.cancelPlayer(id, playerId);
    if (res.success) {
      toast({ title: 'ยกเลิกผู้เล่นสำเร็จ' });
      await fetchPlayersFiltered();
    } else {
      toast({ title: 'ยกเลิกผู้เล่นไม่สำเร็จ', description: res.error, variant: 'destructive' });
    }
  };

  const registerAsMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const res = await apiClient.registerMember(id, {
      startTime: memberTime.startTime,
      endTime: memberTime.endTime,
    });
    if (res.success) {
      toast({ title: 'ลงทะเบียนสำเร็จ' });
      await fetchPlayersFiltered();
    } else {
      toast({ title: 'ลงทะเบียนไม่สำเร็จ', description: res.error, variant: 'destructive' });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-xl">รายละเอียดอีเวนต์</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><b>ชื่อ:</b> {event.eventName}</div>
              <div><b>วันที่:</b> {event.eventDate}</div>
              <div><b>สถานที่:</b> {event.location}</div>
              <div><b>จำนวนสูงสุด:</b> {event.capacity?.maxParticipants}</div>
              <div><b>ที่ว่าง:</b> {event.capacity?.availableSlots ?? '-'}</div>
              <div><b>ลูก:</b> {event.shuttlecockPrice}</div>
              <div><b>ค่าสนาม/ชม.:</b> {event.courtHourlyRate}</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-medium">Waitlist:</span>
                {event.capacity?.waitlistEnabled ? (
                  <Badge variant="default" className="bg-amber-100 text-amber-800 border border-amber-300">เปิด</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-700">ปิด</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 text-sm text-gray-700">
                <div><b>ชั่วโมงสนามรวม:</b> {totalCourtHours.toFixed(1)} ชม.</div>
                <div><b>ประมาณค่าเช่าสนาม:</b> ฿{estimatedCourtCost.toFixed(0)}</div>
                <div><b>ประมาณต่อคน:</b> {perPlayer !== undefined ? `฿${perPlayer}` : '-'}</div>
              </div>
            </div>
            {isAdmin && (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => setEditing((v) => !v)} variant="default">{editing ? 'ยกเลิกแก้ไข' : 'แก้ไข'}</Button>
                <Button onClick={handleDelete} variant="destructive">ลบ</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Courts schedule */}
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-lg">กำหนดการสนาม</CardTitle>
          </CardHeader>
          <CardContent>
            {(!event.courts || event.courts.length === 0) ? (
              <div className="text-gray-600 text-sm">ไม่มีข้อมูลสนาม</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">สนาม</TableHead>
                    <TableHead>เวลาเริ่ม</TableHead>
                    <TableHead>เวลาสิ้นสุด</TableHead>
                    <TableHead className="text-right">ระยะเวลา (ชม.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.courts.map((c, idx) => (
                    <TableRow key={`${c.courtNumber}-${idx}`}>
                      <TableCell>#{c.courtNumber}</TableCell>
                      <TableCell>{fmtTime(c.startTime)}</TableCell>
                      <TableCell>{fmtTime(c.endTime)}</TableCell>
                      <TableCell className="text-right">{calcHours(c.startTime, c.endTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

        {/* Admin: Manage Players (Guests) */}
        {isAdmin && (
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle className="text-lg">จัดการผู้เล่น (Guests)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addGuest} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <Label htmlFor="gname">ชื่อ</Label>
                  <Input id="gname" value={guestForm.name} onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="gphone">เบอร์โทร</Label>
                  <Input id="gphone" value={guestForm.phoneNumber} onChange={(e) => setGuestForm({ ...guestForm, phoneNumber: e.target.value.replace(/\D/g, '').slice(0,10) })} required maxLength={10} inputMode="numeric" />
                </div>
                <div>
                  <Label htmlFor="gstart">เวลาเริ่ม (HH:mm)</Label>
                  <Input id="gstart" value={guestForm.startTime} onChange={(e) => setGuestForm({ ...guestForm, startTime: e.target.value })} placeholder="18:30" />
                </div>
                <div>
                  <Label htmlFor="gend">เวลาสิ้นสุด (HH:mm)</Label>
                  <Input id="gend" value={guestForm.endTime} onChange={(e) => setGuestForm({ ...guestForm, endTime: e.target.value })} placeholder="20:00" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">เพิ่ม Guest</Button>
                </div>
              </form>

              <div className="space-y-4">
                {/* Group: Registered */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">ผู้เล่นที่ลงทะเบียน</h4>
                    <Badge variant="secondary">{players.filter((p:any)=>p.status==='registered').length}</Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='registered').length === 0 ? (
                    <div className="text-gray-600 text-sm">ไม่มีผู้เล่นที่ลงทะเบียน</div>
                  ) : (
                    players.filter((p:any)=>p.status==='registered').map((p:any)=>(
                      <div key={p.playerId || p.id || p._id} className="flex items-center justify-between border rounded px-3 py-2 mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {p.name}
                            <Badge className="bg-green-100 text-green-800 border border-green-300">Registered</Badge>
                          </div>
                          <div className="text-sm text-gray-600">{p.phoneNumber || p.email || ''}</div>
                          <div className="text-xs text-gray-500">{p.startTime || '-'} - {p.endTime || '-'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={() => cancelPlayer(p.playerId || p.id || p._id)}>ยกเลิก</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Group: Waitlist */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">รายชื่อสำรอง (Waitlist)</h4>
                    <Badge variant="secondary">{players.filter((p:any)=>p.status==='waitlist').length}</Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='waitlist').length === 0 ? (
                    <div className="text-gray-600 text-sm">ไม่มีรายชื่อสำรอง</div>
                  ) : (
                    players.filter((p:any)=>p.status==='waitlist').map((p:any)=>(
                      <div key={p.playerId || p.id || p._id} className="flex items-center justify-between border rounded px-3 py-2 mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {p.name}
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Waitlist</Badge>
                          </div>
                          <div className="text-sm text-gray-600">{p.phoneNumber || p.email || ''}</div>
                          <div className="text-xs text-gray-500">{p.startTime || '-'} - {p.endTime || '-'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={() => cancelPlayer(p.playerId || p.id || p._id)}>ยกเลิก</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User self registration/cancel */}
        {user && !isAdmin && (
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle className="text-lg">ลงทะเบียนเข้าร่วมกิจกรรม</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const mine = players.find((p:any) => p.userId && user && (p.userId === user.id) && p.status !== 'canceled');
                if (mine) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <div className="font-medium">คุณลงทะเบียนแล้ว ({mine.status})</div>
                        <div className="text-xs text-gray-500">{mine.startTime || '-'} - {mine.endTime || '-'}</div>
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full" variant="destructive" onClick={() => cancelPlayer(mine.playerId)}>ยกเลิก</Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <form onSubmit={registerAsMember} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="mstart">เวลาเริ่ม</Label>
                      <Input id="mstart" type="time" value={memberTime.startTime} onChange={(e)=>setMemberTime({...memberTime,startTime:e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="mend">เวลาสิ้นสุด</Label>
                      <Input id="mend" type="time" value={memberTime.endTime} onChange={(e)=>setMemberTime({...memberTime,endTime:e.target.value})} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full">ลงทะเบียน</Button>
                    </div>
                  </form>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Users: View current players list (like admin) */}
        {user && !isAdmin && (
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle className="text-lg">รายชื่อผู้เล่น</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Registered group */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">ผู้เล่นที่ลงทะเบียน</h4>
                    <Badge variant="secondary">{players.filter((p:any)=>p.status==='registered').length}</Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='registered').length === 0 ? (
                    <div className="text-gray-600 text-sm">ไม่มีผู้เล่นที่ลงทะเบียน</div>
                  ) : (
                    players.filter((p:any)=>p.status==='registered').map((p:any)=>(
                      <div key={p.playerId || p.id || p._id} className="flex items-center justify-between border rounded px-3 py-2 mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {p.name}
                            <Badge className="bg-green-100 text-green-800 border border-green-300">Registered</Badge>
                          </div>
                          <div className="text-sm text-gray-600">{p.phoneNumber || p.email || ''}</div>
                          <div className="text-xs text-gray-500">{p.startTime || '-'} - {p.endTime || '-'}</div>
                        </div>
                        {/* ซ่อนปุ่มยกเลิกในรายการของ user เพื่อให้เหลือปุ่มเดียวด้านบน */}
                      </div>
                    ))
                  )}
                </div>

                {/* Waitlist group */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">รายชื่อสำรอง (Waitlist)</h4>
                    <Badge variant="secondary">{players.filter((p:any)=>p.status==='waitlist').length}</Badge>
                  </div>
                  {players.filter((p:any)=>p.status==='waitlist').length === 0 ? (
                    <div className="text-gray-600 text-sm">ไม่มีรายชื่อสำรอง</div>
                  ) : (
                    players.filter((p:any)=>p.status==='waitlist').map((p:any)=>(
                      <div key={p.playerId || p.id || p._id} className="flex items-center justify-between border rounded px-3 py-2 mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {p.name}
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Waitlist</Badge>
                          </div>
                          <div className="text-sm text-gray-600">{p.phoneNumber || p.email || ''}</div>
                          <div className="text-xs text-gray-500">{p.startTime || '-'} - {p.endTime || '-'}</div>
                        </div>
                        {/* ซ่อนปุ่มยกเลิกในรายการของ user เพื่อให้เหลือปุ่มเดียวด้านบน */}
                      </div>
                    ))
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
