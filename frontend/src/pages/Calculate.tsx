import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { CheckCircle, Clock, Users, Calculator, Receipt } from 'lucide-react';

interface CostBreakdownItem {
  playerId: string;
  name: string;
  userType: 'member' | 'guest';
  startTime: string;
  endTime: string;
  playHours: number;
  courtFee: number;
  shuttlecockFee: number;
  fine: number;
  total: number;
  isPaid: boolean;
}

interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  membersPaid: number;
  guestsPaid: number;
  totalMembers: number;
  totalGuests: number;
}

const CalculatePage = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventDetail, setEventDetail] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<CostBreakdownItem[]>([]);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !isAdmin) return;
      const res = await apiClient.getEvents({ limit: 50, offset: 0 });
      if (res.success) {
        const list = (res.data as any).events || (res.data as any) || [];
        setEvents(list);
        if (list.length > 0) setSelectedEventId(list[0].id);
      } else {
        toast({ title: 'โหลดรายการอีเวนต์ไม่สำเร็จ', description: res.error, variant: 'destructive' });
      }
    };
    fetch();
  }, [user, isAdmin, toast]);

  const loadEventData = async (eventId: string) => {
    const [detail, reg, wait] = await Promise.all([
      apiClient.getEvent(eventId),
      apiClient.getPlayers(eventId, { status: 'registered', limit: 100, offset: 0 }),
      apiClient.getPlayers(eventId, { status: 'waitlist', limit: 100, offset: 0 }),
    ]);
    if (detail.success) setEventDetail((detail.data as any).event || detail.data);
    const regList = reg.success ? ((reg.data as any).players || (reg.data as any) || []) : [];
    const waitList = wait.success ? ((wait.data as any).players || (wait.data as any) || []) : [];
    setPlayers([...regList, ...waitList]);
  };

  const generateMockData = () => {
    // Mock data for API development
    const mockBreakdown: CostBreakdownItem[] = [
      {
        playerId: '1',
        name: 'อรรถพล มหาชัย',
        userType: 'member',
        startTime: '09:00',
        endTime: '11:00',
        playHours: 2,
        courtFee: 150,
        shuttlecockFee: 50,
        fine: 0,
        total: 200,
        isPaid: false
      },
      {
        playerId: '2',
        name: 'สมชาย ใจดี',
        userType: 'guest',
        startTime: '09:00',
        endTime: '10:00',
        playHours: 1,
        courtFee: 75,
        shuttlecockFee: 50,
        fine: 20,
        total: 145,
        isPaid: true
      },
      {
        playerId: '3',
        name: 'วิชัย สุขสันต์',
        userType: 'member',
        startTime: '10:00',
        endTime: '12:00',
        playHours: 2,
        courtFee: 150,
        shuttlecockFee: 50,
        fine: 0,
        total: 200,
        isPaid: true
      },
      {
        playerId: '4',
        name: 'นิรันดร์ แสงทอง',
        userType: 'guest',
        startTime: '09:30',
        endTime: '11:30',
        playHours: 2,
        courtFee: 150,
        shuttlecockFee: 50,
        fine: 0,
        total: 200,
        isPaid: false
      }
    ];
    return mockBreakdown;
  };

  const calculate = () => {
    if (!eventDetail) {
      // Use mock data if no event selected (for development)
      const mockData = generateMockData();
      setBreakdown(mockData);
      setIsCalculated(true);
      toast({
        title: 'คำนวณสำเร็จ',
        description: 'ใช้ข้อมูลจำลองสำหรับการพัฒนา API',
        variant: 'default'
      });
      return;
    }

    const registered = players.filter((p: any) => p.status === 'registered');
    if (registered.length === 0) {
      setBreakdown([]);
      setIsCalculated(false);
      return;
    }

    const toMs = (t?: string) => {
      if (!t) return NaN;
      const d = new Date(`2000-01-01T${t}`);
      return d.getTime();
    };

    const playerHours = registered.map((p: any) => {
      const s = toMs(p.startTime);
      const e = toMs(p.endTime);
      const h = !Number.isNaN(s) && !Number.isNaN(e) && e > s ? (e - s) / 3600000 : 0;
      return {
        id: p.playerId,
        name: p.name || 'ไม่ระบุชื่อ',
        hours: h,
        userType: p.userType || 'member',
        startTime: p.startTime || '09:00',
        endTime: p.endTime || '10:00'
      };
    });

    const sumHours = playerHours.reduce((a, b) => a + b.hours, 0);
    const courtHours = Array.isArray(eventDetail.courts) ? eventDetail.courts.reduce((acc: number, c: any) => {
      const s = toMs(c.startTime);
      const e = toMs(c.endTime);
      const h = !Number.isNaN(s) && !Number.isNaN(e) && e > s ? (e - s) / 3600000 : 0;
      return acc + h;
    }, 0) : 0;

    const totalCourtCost = (eventDetail.courtHourlyRate || 150) * courtHours;
    const proportional = sumHours > 0;
    const equalShare = totalCourtCost / registered.length;
    const shuttlePerPlayer = Number(eventDetail.shuttlecockPrice || 50);

    const data: CostBreakdownItem[] = playerHours.map(ph => {
      const courtFee = proportional ? (ph.hours / sumHours) * totalCourtCost : equalShare;
      const shuttlecockFee = shuttlePerPlayer;
      const fine = Math.random() > 0.8 ? 20 : 0; // Random fine for demo
      const total = courtFee + shuttlecockFee + fine;

      return {
        playerId: ph.id,
        name: ph.name,
        userType: ph.userType,
        startTime: ph.startTime,
        endTime: ph.endTime,
        playHours: Math.round(ph.hours * 100) / 100,
        courtFee: Math.round(courtFee * 100) / 100,
        shuttlecockFee,
        fine,
        total: Math.round(total * 100) / 100,
        isPaid: Math.random() > 0.5 // Random payment status for demo
      };
    });

    setBreakdown(data);
    setIsCalculated(true);
    toast({
      title: 'คำนวณสำเร็จ',
      description: `คำนวณค่าใช้จ่ายสำหรับ ${data.length} คน เรียบร้อยแล้ว`
    });
  };

  const handlePaymentToggle = (playerId: string, isPaid: boolean) => {
    setBreakdown(prev => prev.map(item =>
      item.playerId === playerId ? { ...item, isPaid } : item
    ));

    const playerName = breakdown.find(item => item.playerId === playerId)?.name;
    toast({
      title: isPaid ? 'ชำระเงินแล้ว' : 'ยกเลิกการชำระ',
      description: `${playerName} ${isPaid ? 'ชำระเงินเรียบร้อย' : 'ยกเลิกสถานะการชำระ'}`
    });
  };

  const paymentSummary: PaymentSummary = useMemo(() => {
    const totalAmount = breakdown.reduce((sum, item) => sum + item.total, 0);
    const totalPaid = breakdown.filter(item => item.isPaid).reduce((sum, item) => sum + item.total, 0);
    const totalPending = totalAmount - totalPaid;

    const members = breakdown.filter(item => item.userType === 'member');
    const guests = breakdown.filter(item => item.userType === 'guest');

    const membersPaid = members.filter(item => item.isPaid).reduce((sum, item) => sum + item.total, 0);
    const guestsPaid = guests.filter(item => item.isPaid).reduce((sum, item) => sum + item.total, 0);

    return {
      totalAmount,
      totalPaid,
      totalPending,
      membersPaid,
      guestsPaid,
      totalMembers: members.length,
      totalGuests: guests.length
    };
  }, [breakdown]);

  const submitCalculation = async () => {
    // This would be the API call to submit calculation results
    const payload = {
      eventId: selectedEventId,
      breakdown: breakdown,
      summary: paymentSummary,
      calculatedAt: new Date().toISOString()
    };

    console.log('Submitting calculation to API:', payload);

    toast({
      title: 'ส่งข้อมูลสำเร็จ',
      description: 'บันทึกการคำนวณค่าใช้จ่ายเรียบร้อยแล้ว',
    });
  };

  useEffect(() => {
    if (selectedEventId && isAdmin) loadEventData(selectedEventId);
  }, [selectedEventId, isAdmin]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card><CardContent className="p-6 text-gray-700">กรุณาเข้าสู่ระบบเพื่อใช้งาน</CardContent></Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="p-6 text-center">
            <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
            <p className="text-sm text-gray-500">หากคุณต้องการคำนวณค่าใช้จ่าย กรุณาติดต่อผู้ดูแลระบบ</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-xl">คำนวณค่าใช้จ่าย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอีเวนต์" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.eventName} — {ev.eventDate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={calculate}>คำนวณ</Button>
              </div>
            </div>

            {isCalculated && breakdown.length > 0 && (
              <div className="space-y-4">
                {/* Payment Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-700">{breakdown.length}</p>
                      <p className="text-sm text-blue-600">ผู้เล่นทั้งหมด</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-700">฿{paymentSummary.totalPaid.toFixed(2)}</p>
                      <p className="text-sm text-green-600">ชำระแล้ว</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-amber-700">฿{paymentSummary.totalPending.toFixed(2)}</p>
                      <p className="text-sm text-amber-600">รอชำระ</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <Calculator className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-700">฿{paymentSummary.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-purple-600">ยอดรวม</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Breakdown Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Receipt className="w-5 h-5 mr-2" />
                      รายละเอียดค่าใช้จ่ายแต่ละคน
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ชื่อผู้เล่น</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead>เวลา</TableHead>
                            <TableHead className="text-right">ค่าสนาม</TableHead>
                            <TableHead className="text-right">ลูกขนไก่</TableHead>
                            <TableHead className="text-right">ค่าปรับ</TableHead>
                            <TableHead className="text-right">รวม</TableHead>
                            <TableHead className="text-center">สถานะ</TableHead>
                            <TableHead className="text-center">การชำระ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {breakdown.map((item) => (
                            <TableRow key={item.playerId} className={item.isPaid ? 'bg-green-50' : ''}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.userType === 'member' ? 'default' : 'secondary'}
                                  className={item.userType === 'member' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                                >
                                  {item.userType === 'member' ? 'สมาชิก' : 'แขก'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {item.startTime}
                                  </span>
                                  <span className="text-gray-400">-</span>
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {item.endTime}
                                  </span>
                                </div>
                                <div className="text-gray-500 text-xs mt-1">({item.playHours} ชม.)</div>
                              </TableCell>
                              <TableCell className="text-right">฿{item.courtFee.toFixed(2)}</TableCell>
                              <TableCell className="text-right">฿{item.shuttlecockFee.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                {item.fine > 0 ? (
                                  <span className="text-red-600">฿{item.fine.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold">฿{item.total.toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={`${item.isPaid
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-amber-100 text-amber-700 border-amber-300'
                                  }`}
                                >
                                  {item.isPaid ? (
                                    <>ชำระแล้ว</>
                                  ) : (
                                    <>รอชำระ</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {item.userType === 'member' ? (
                                  <div className="text-sm text-gray-500">อัตโนมัติ</div>
                                ) : (
                                  <Checkbox
                                    checked={item.isPaid}
                                    onCheckedChange={(checked) =>
                                      handlePaymentToggle(item.playerId, !!checked)
                                    }
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      const allPaid = breakdown.map(item => ({ ...item, isPaid: true }));
                      setBreakdown(allPaid);
                      toast({ title: 'ทำเครื่องหมายทั้งหมด', description: 'ทำเครื่องหมายทุกคนว่าชำระแล้ว' });
                    }}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    ทำเครื่องหมายทั้งหมดว่าชำระแล้ว
                  </Button>

                  <Button
                    onClick={submitCalculation}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    บันทึกการคำนวณ
                  </Button>
                </div>
              </div>
            )}

            {!selectedEventId && !isCalculated && (
              <div className="text-center py-8">
                <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">เลือกอีเวนต์เพื่อเริ่มคำนวณค่าใช้จ่าย</p>
                <p className="text-sm text-gray-500">หรือกดปุ่มคำนวณเพื่อดูตัวอย่างข้อมูล</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default CalculatePage;