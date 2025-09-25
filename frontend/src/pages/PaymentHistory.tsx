import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ArrowLeft, CheckCircle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { mockPaymentHistory, mockNextPayoutNotice } from '@/data/mockPaymentHistory';

const PaymentHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ประวัติการจ่ายเงิน</h1>
              <p className="text-sm text-gray-600">ตัวอย่างข้อมูลรอการเชื่อมต่อระบบจริง</p>
            </div>
          </div>
        </div>

        {/* Upcoming Payout Notice */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Info className="w-5 h-5 text-purple-600 mr-2" />
              {mockNextPayoutNotice.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-700">
            <p>{mockNextPayoutNotice.description}</p>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 w-fit">
              <Clock className="w-3 h-3 mr-1" />
              {mockNextPayoutNotice.eta}
            </Badge>
          </CardContent>
        </Card>

        {/* Payment History List */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-gray-900">
              รายการล่าสุด ({mockPaymentHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockPaymentHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-gray-50 rounded-lg border"
              >
                <div>
                  <p className="font-semibold text-gray-900">{entry.title}</p>
                  <p className="text-sm text-gray-600">{entry.datetime}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-900">{entry.amount}</span>
                  <Badge
                    className={
                      entry.status === 'ชำระแล้ว'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }
                  >
                    {entry.status === 'ชำระแล้ว' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {entry.status}
                  </Badge>
                </div>
              </div>
            ))}

            <div className="text-center text-sm text-gray-500">
              ข้อมูลนี้เป็นตัวอย่างเพื่อทดสอบหน้าจอ เมื่อเชื่อมต่อบริการจริง รายการจะแสดงโดยอัตโนมัติ
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button onClick={() => navigate('/payments')} className="bg-purple-600 hover:bg-purple-700 text-white">
            ไปหน้าชำระเงิน
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
