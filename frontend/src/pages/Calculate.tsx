import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';
import { CheckCircle, Clock, Users, Calculator, Receipt, Loader2 } from 'lucide-react';

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
  const [shuttlecockCount, setShuttlecockCount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingShuttlecock, setIsSavingShuttlecock] = useState<boolean>(false);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !isAdmin) return;
      const res = await apiClient.getEvents({ limit: 50, offset: 0, status: 'calculating' });
      if (res.success) {
        const list = (res.data as any).events || (res.data as any) || [];

        // Debug: Log user and event information
        console.log('Current user full object:', user);
        console.log('All events:', list.map((e: any) => ({ id: e.id, name: e.eventName, createdBy: e.createdBy })));

        // Filter events to show only those created by the current user
        // Try multiple potential user ID fields
        const userId = user.id || (user as any).userId;

        const userEvents = list.filter((event: any) => {
          const matches = event.createdBy === userId;
          console.log(`Event ${event.eventName} - createdBy: ${event.createdBy}, userId: ${userId}, matches: ${matches}`);
          return matches;
        });

        console.log('Filtered user events:', userEvents.map((e: any) => ({ id: e.id, name: e.eventName, createdBy: e.createdBy })));

        setEvents(userEvents);
        if (userEvents.length > 0) setSelectedEventId(userEvents[0].id);
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
    if (detail.success) {
      const eventData = (detail.data as any).event || detail.data;
      setEventDetail(eventData);
    }
    const regList = reg.success ? ((reg.data as any).players || (reg.data as any) || []) : [];
    const waitList = wait.success ? ((wait.data as any).players || (wait.data as any) || []) : [];
    setPlayers([...regList, ...waitList]);
  };


  // Validation function to check if inputs are valid
  const isFormValid = useMemo(() => {
    const shuttlecockNum = parseInt(shuttlecockCount);

    return (
      shuttlecockCount.trim() !== '' &&
      !isNaN(shuttlecockNum) &&
      shuttlecockNum > 0 &&
      selectedEventId &&
      eventDetail
    );
  }, [shuttlecockCount, selectedEventId, eventDetail]);


  const saveShuttlecockCount = async () => {
    if (!selectedEventId || !shuttlecockCount.trim() || isNaN(parseInt(shuttlecockCount)) || parseInt(shuttlecockCount) <= 0) {
      return;
    }

    setIsSavingShuttlecock(true);
    try {
      console.log('🚀 Saving shuttlecock count to event...');
      console.log('Event ID:', selectedEventId);
      console.log('Shuttlecock Count:', shuttlecockCount);

      const response = await apiClient.updateEvent(selectedEventId, {
        shuttlecockCount: parseInt(shuttlecockCount)
      });

      console.log('Update event response:', response);

      if (!response.success) {
        console.error('Update event failed:', response.error);
        throw new Error(response.error || 'ไม่สามารถบันทึกจำนวนลูกขนไก่ได้');
      }

      toast({
        title: 'บันทึกสำเร็จ! 🎉',
        description: `บันทึกจำนวนลูกขนไก่ ${shuttlecockCount} ลูก เรียบร้อยแล้ว`,
      });

      // Reload event data to get updated information
      if (selectedEventId) {
        await loadEventData(selectedEventId);
      }

    } catch (error) {
      console.error('Save shuttlecock count error:', error);
      toast({
        title: 'เกิดข้อผิดพลาดในการบันทึก',
        description: error instanceof Error ? error.message : 'ไม่สามารถบันทึกจำนวนลูกขนไก่ได้',
        variant: 'destructive'
      });
    } finally {
      setIsSavingShuttlecock(false);
    }
  };

  const calculate = async () => {
    try {
      console.log('🚀 Starting settlement calculation...');
      console.log('Event ID:', selectedEventId);
      console.log('Event Detail:', eventDetail);
      console.log('Auth Token exists:', !!localStorage.getItem('authToken'));

      if (!selectedEventId) {
        throw new Error('กรุณาเลือกอีเวนต์ก่อน');
      }

      if (!eventDetail) {
        throw new Error('ไม่พบข้อมูลอีเวนต์ กรุณารีเฟรชหน้า');
      }

      // Use apiClient settlement calculation method (preview mode)
      console.log('Calling settlement calculation API...');
      const response = await apiClient.calculateSettlement(selectedEventId, {
        currency: 'THB',
        shuttlecockCount: parseInt(shuttlecockCount),
        absentPlayerIds: []
      });

      console.log('Settlement API response:', response); // Debug log

      if (!response.success) {
        console.error('Settlement API failed:', response.error);
        throw new Error(response.error || 'ไม่สามารถคำนวณค่าใช้จ่ายได้');
      }

      if (response.success && response.data && (response.data as any).calculationResults) {
        // Transform settlement API response to breakdown format
        const transformedData: CostBreakdownItem[] = (response.data as any).calculationResults.map((item: any) => ({
          playerId: item.playerId,
          name: item.name || 'ไม่ระบุชื่อ',
          userType: item.role === 'member' ? 'member' : 'guest',
          startTime: item.startTime || '09:00',
          endTime: item.endTime || '10:00',
          playHours: item.breakdown?.hoursPlayed || 0,
          courtFee: item.courtFee || 0,
          shuttlecockFee: item.shuttlecockFee || 0,
          fine: item.penaltyFee || 0,
          total: item.totalAmount || 0,
          isPaid: item.paymentStatus === 'completed' || false
        }));

        setBreakdown(transformedData);
        setIsCalculated(true);
        toast({
          title: 'คำนวณสำเร็จ (โหมดดูตัวอย่าง)',
          description: `คำนวณค่าใช้จ่ายสำหรับ ${transformedData.length} คน เรียบร้อยแล้ว - ยังไม่ได้เก็บเงินจริง`
        });
      } else {
        throw new Error('Invalid response format from settlement API');
      }
    } catch (error) {
      console.error('Settlement API error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'ไม่สามารถคำนวณค่าใช้จ่ายได้',
        variant: 'destructive'
      });
    }
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
    if (!selectedEventId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      console.log('🚀 Starting actual settlement issue...');
      console.log('Event ID:', selectedEventId);
      console.log('Shuttlecock Count:', shuttlecockCount);

      // Use apiClient issueSettlement method to actually charge players
      const response = await apiClient.issueSettlement(selectedEventId, {
        currency: 'THB',
        shuttlecockCount: parseInt(shuttlecockCount),
        absentPlayerIds: []
      });

      console.log('Settlement issue response:', response);

      if (!response.success) {
        console.error('Settlement issue failed:', response.error);
        throw new Error(response.error || 'ไม่สามารถดำเนินการเก็บเงินได้');
      }

      // Show success message with settlement details
      const settlementData = response.data as any;
      const successfulCharges = settlementData.successfulCharges || 0;
      const failedCharges = settlementData.failedCharges || 0;
      const totalCollected = settlementData.totalCollected || 0;

      toast({
        title: 'ดำเนินการเก็บเงินสำเร็จ! 🎉',
        description: `เก็บเงินสำเร็จ ${successfulCharges} คน, ล้มเหลว ${failedCharges} คน, รวมเก็บได้ ฿${totalCollected.toFixed(2)}`,
      });

      // Update breakdown with actual payment results if available
      if (settlementData.calculationResults) {
        const updatedBreakdown: CostBreakdownItem[] = settlementData.calculationResults.map((item: any) => ({
          playerId: item.playerId,
          name: item.name || 'ไม่ระบุชื่อ',
          userType: item.role === 'member' ? 'member' : 'guest',
          startTime: item.startTime || '09:00',
          endTime: item.endTime || '10:00',
          playHours: item.breakdown?.hoursPlayed || 0,
          courtFee: item.courtFee || 0,
          shuttlecockFee: item.shuttlecockFee || 0,
          fine: item.penaltyFee || 0,
          total: item.totalAmount || 0,
          isPaid: item.paymentStatus === 'completed' || item.paymentStatus === 'paid' || false
        }));
        setBreakdown(updatedBreakdown);
      }

    } catch (error) {
      console.error('Settlement issue error:', error);
      toast({
        title: 'เกิดข้อผิดพลาดในการเก็บเงิน',
        description: error instanceof Error ? error.message : 'ไม่สามารถดำเนินการเก็บเงินได้',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-select">เลือกอีเวนต์</Label>
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

              <div className="space-y-2">
                <Label htmlFor="shuttlecock-count">จำนวนลูกขนไก่ที่ใช้</Label>
                <div className="flex gap-2">
                  <Input
                    id="shuttlecock-count"
                    type="number"
                    min="1"
                    value={shuttlecockCount}
                    onChange={(e) => setShuttlecockCount(e.target.value)}
                    placeholder="เช่น 4"
                    className={`flex-1 ${shuttlecockCount.trim() !== '' && (isNaN(parseInt(shuttlecockCount)) || parseInt(shuttlecockCount) <= 0) ? 'border-red-500' : ''}`}
                  />
                  <Button
                    onClick={saveShuttlecockCount}
                    disabled={!selectedEventId || !shuttlecockCount.trim() || isNaN(parseInt(shuttlecockCount)) || parseInt(shuttlecockCount) <= 0 || isSavingShuttlecock}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {isSavingShuttlecock ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        บันทึก...
                      </>
                    ) : (
                      <>
                        บันทึก
                      </>
                    )}
                  </Button>
                </div>
                {shuttlecockCount.trim() !== '' && (isNaN(parseInt(shuttlecockCount)) || parseInt(shuttlecockCount) <= 0) && (
                  <p className="text-red-500 text-xs mt-1">กรุณาใส่จำนวนที่มากกว่า 0</p>
                )}
              </div>
            </div>

            {/* Player List */}
            {eventDetail && players.length > 0 && !isCalculated && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    รายชื่อผู้เล่น ({players.length} คน)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.map((player, index) => {
                      const playerId = player.playerId || player.id || `player-${index}`;
                      const isPenalty = player.isPenalty === true;

                      return (
                        <div
                          key={playerId}
                          className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                            isPenalty
                              ? 'bg-red-50 border-red-300 shadow-md'
                              : 'bg-white border-green-300'
                          }`}
                        >
                          {/* Status indicator */}
                          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            isPenalty ? 'bg-red-500' : 'bg-green-500'
                          }`}>
                            {isPenalty ? '⚠' : '✓'}
                          </div>

                          <div className="pr-8">
                            <div className="flex items-start justify-between mb-2">
                              <div className={`font-medium ${isPenalty ? 'text-red-800' : 'text-gray-800'}`}>
                                {player.name ?? player.email ?? 'ไม่ระบุ'}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant={player.userType === 'member' ? 'default' : 'secondary'}
                                className={`text-xs ${player.userType === 'member' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                              >
                                {player.userType === 'member' ? 'สมาชิก' : 'แขก'}
                              </Badge>
                            </div>

                            {player.startTime && player.endTime && (
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {player.startTime} - {player.endTime}
                              </div>
                            )}

                            {player.phoneNumber && (
                              <div className="text-xs text-gray-500 mb-2">{player.phoneNumber}</div>
                            )}

                            <div className="mt-2">
                              <Badge
                                className={`text-xs ${
                                  isPenalty
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : 'bg-green-100 text-green-700 border-green-300'
                                }`}
                              >
                                {isPenalty ? '❌ ต้องเสียค่าปรับ' : '✅ ปกติ'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {players.some(p => p.isPenalty) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-800">
                        <div className="text-red-600">💰</div>
                        <div className="text-sm">
                          <strong>ผู้เล่นที่ต้องเสียค่าปรับ:</strong> {players.filter(p => p.isPenalty).length} คน
                          <div className="text-xs text-red-600 mt-1">
                            ค่าปรับจะถูกคำนวณตามที่กำหนดไว้ในอีเวนต์
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button
                className={`w-full md:w-auto px-8 ${isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                onClick={calculate}
                disabled={!isFormValid}
              >
                <Calculator className="w-4 h-4 mr-2" />
                คำนวณค่าใช้จ่าย (โหมดดูตัวอย่าง)
              </Button>
            </div>

            {isCalculated && breakdown.length > 0 && (
              <div className="space-y-4">
                {/* Preview Mode Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-blue-600 text-white">โหมดดูตัวอย่าง</Badge>
                    <span className="text-blue-800 text-sm">
                      ผลการคำนวณนี้เป็นเพียงการแสดงตัวอย่าง ยังไม่ได้เก็บเงินจากผู้เล่นจริง
                    </span>
                  </div>
                </div>
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

                {/* Warning and Submit Button */}
                <div className="space-y-4">
                  {/* <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <div className="text-amber-600 mt-0.5">⚠️</div>
                      <div className="text-sm text-amber-800">
                        <strong>คำเตือน:</strong> การกดปุ่ม "เก็บเงินจริงตามการคำนวณ" จะทำการ<strong>เก็บเงินจริง</strong>จากผู้เล่นทุกคน
                        และส่งการแจ้งเตือนไปยัง Payment Service เพื่อประมวลผลการชำระเงิน กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ
                      </div>
                    </div>
                  </div> */}

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={submitCalculation}
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          บันทึกการคำนวณ...
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4 mr-2" />
                          บันทึกการคำนวณ
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!selectedEventId && !isCalculated && (
              <div className="text-center py-8">
                <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">เลือกอีเวนต์เพื่อเริ่มคำนวณค่าใช้จ่าย</p>
                <p className="text-sm text-gray-500">กรุณาเลือกอีเวนต์และกรอกจำนวนลูกขนไก่ที่ใช้</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default CalculatePage;