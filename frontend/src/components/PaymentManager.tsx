import React, { useState } from 'react';
import { CreditCard, CheckCircle, Clock, QrCode, DollarSign, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { Player, Event } from '@/pages/Index';
import { useToast } from '@/hooks/use-toast';

interface PaymentManagerProps {
  event: Event;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => void;
  costBreakdown: Array<{
    name: string;
    playerId: string;
    courtFee: number;
    shuttlecockFee: number;
    fine: number;
    total: number;
  }>;
}

interface PaymentStatus {
  playerId: string;
  isPaid: boolean;
  paidAmount: number;
  paidAt?: Date;
  paymentMethod?: string;
}

const PaymentManager: React.FC<PaymentManagerProps> = ({ 
  event, 
  onUpdateEvent, 
  costBreakdown 
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Mock payment status - in real app this would come from database
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>(
    costBreakdown.map(item => ({
      playerId: item.playerId,
      isPaid: Math.random() > 0.5, // Random for demo
      paidAmount: 0,
      paymentMethod: 'qr_code'
    }))
  );

  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  const handlePaymentStatusChange = (playerId: string, isPaid: boolean) => {
    const updatedStatuses = paymentStatuses.map(status =>
      status.playerId === playerId
        ? { 
            ...status, 
            isPaid,
            paidAt: isPaid ? new Date() : undefined,
            paidAmount: isPaid ? costBreakdown.find(c => c.playerId === playerId)?.total || 0 : 0
          }
        : status
    );
    
    setPaymentStatuses(updatedStatuses);
    
    const playerName = costBreakdown.find(c => c.playerId === playerId)?.name;
    toast({
      title: isPaid ? "Payment Confirmed" : "Payment Status Updated",
      description: `${playerName} marked as ${isPaid ? 'paid' : 'unpaid'}`,
    });
  };

  const generateQRCode = (playerId: string) => {
    // In real app, this would generate actual QR code for payment
    setShowQRCode(playerId);
  };

  const totalAmount = costBreakdown.reduce((sum, item) => sum + item.total, 0);
  const totalPaid = paymentStatuses
    .filter(s => s.isPaid)
    .reduce((sum, status) => {
      const cost = costBreakdown.find(c => c.playerId === status.playerId);
      return sum + (cost?.total || 0);
    }, 0);
  const totalPending = totalAmount - totalPaid;

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center text-green-900">
          <CreditCard className="w-5 h-5 mr-2" />
          {t('payment.title')}
        </CardTitle>
        <CardDescription>
          รายละเอียดการชำระเงินสำหรับกิจกรรม {event.eventName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">฿{totalPaid.toFixed(2)}</p>
              <p className="text-sm text-green-600">ชำระแล้ว</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-700">฿{totalPending.toFixed(2)}</p>
              <p className="text-sm text-amber-600">รอชำระ</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">฿{totalAmount.toFixed(2)}</p>
              <p className="text-sm text-blue-600">ยอดรวม</p>
            </CardContent>
          </Card>
        </div>

        {/* Individual Payment Status */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">รายการชำระเงินรายบุคคล</h3>
          <div className="space-y-2">
            {costBreakdown.map((cost, index) => {
              const paymentStatus = paymentStatuses.find(s => s.playerId === cost.playerId);
              const isPaid = paymentStatus?.isPaid || false;
              
              return (
                <Card key={cost.playerId} className={`transition-all ${isPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                      
                      {/* Player Info */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {cost.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{cost.name}</p>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <span>สนาม: ฿{cost.courtFee}</span>
                            <span>•</span>
                            <span>ลูกขนไก่: ฿{cost.shuttlecockFee}</span>
                            {cost.fine > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-600">ปรับ: ฿{cost.fine}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment Status & Actions */}
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">฿{cost.total}</p>
                          <Badge 
                            className={`${isPaid 
                              ? 'bg-green-100 text-green-700 border-green-300' 
                              : 'bg-amber-100 text-amber-700 border-amber-300'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                ชำระแล้ว
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                รอชำระ
                              </>
                            )}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`payment-${cost.playerId}`}
                            checked={isPaid}
                            onCheckedChange={(checked) => 
                              handlePaymentStatusChange(cost.playerId, !!checked)
                            }
                          />
                          
                          {!isPaid && (
                            <Button
                              onClick={() => generateQRCode(cost.playerId)}
                              variant="outline"
                              size="sm"
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <QrCode className="w-4 h-4 mr-1" />
                              QR
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white max-w-sm w-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="w-5 h-5 mr-2" />
                  QR Code Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-100 p-8 rounded-lg text-center">
                  <QrCode className="w-32 h-32 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">
                    Mock QR Code for payment
                  </p>
                  <p className="font-medium">
                    Amount: ฿{costBreakdown.find(c => c.playerId === showQRCode)?.total}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      handlePaymentStatusChange(showQRCode, true);
                      setShowQRCode(null);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Mark as Paid
                  </Button>
                  <Button
                    onClick={() => setShowQRCode(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={() => {
              // Mark all as paid for demo
              const allPaidStatuses = paymentStatuses.map(status => ({
                ...status,
                isPaid: true,
                paidAt: new Date(),
                paidAmount: costBreakdown.find(c => c.playerId === status.playerId)?.total || 0
              }));
              setPaymentStatuses(allPaidStatuses);
              toast({
                title: "All Payments Confirmed",
                description: "All players marked as paid",
              });
            }}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            ทำเครื่องหมายทั้งหมดว่าชำระแล้ว
          </Button>
          
          <Button
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 flex-1"
          >
            <Receipt className="w-4 h-4 mr-2" />
            ส่งออกรายงาน
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentManager;