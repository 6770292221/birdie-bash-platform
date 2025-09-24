import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Shield, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MockAccountSetup = () => {
  const [showInstructions, setShowInstructions] = useState(true);

  const mockAccounts = [
    {
      type: 'admin',
      email: 'admin@badminton.com',
      password: 'admin123',
      name: 'ผู้ดูแลระบบ',
      description: 'สามารถจัดการอีเวนต์และดูข้อมูลทั้งหมด',
      features: ['สร้างและแก้ไขอีเวนต์', 'จัดการผู้เล่น', 'คำนวณค่าใช้จ่าย', 'ดูรายงานทั้งหมด']
    },
    {
      type: 'user',
      email: 'user@badminton.com', 
      password: 'user123',
      name: 'ผู้ใช้ทั่วไป',
      description: 'สามารถลงทะเบียนเข้าร่วมอีเวนต์',
      features: ['ดูอีเวนต์ทั้งหมด', 'ลงทะเบียนเข้าร่วม', 'ยกเลิกการลงทะเบียน', 'ดูสถานะการลงทะเบียน']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mock User Accounts</h1>
          <p className="text-gray-600">บัญชีสำหรับทดสอบระบบจัดการแบดมินตัน</p>
        </div>

        {showInstructions && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>วิธีการใช้งาน:</strong> คุณสามารถสร้างบัญชีเหล่านี้โดยไปที่หน้า Register และใช้ข้อมูลดังต่อไปนี้ 
              หรือใช้ข้อมูลเหล่านี้ในหน้า Login ถ้าบัญชีถูกสร้างแล้ว
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 h-auto p-1 text-blue-600"
                onClick={() => setShowInstructions(false)}
              >
                ปิด
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {mockAccounts.map((account, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className={`${
                account.type === 'admin' 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              } text-white`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    {account.type === 'admin' ? 
                      <Shield className="w-6 h-6" /> : 
                      <User className="w-6 h-6" />
                    }
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">{account.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                      {account.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-white/90 mt-2">
                  {account.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                      {account.email}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-sm font-medium text-gray-600">Password</label>
                    <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                      {account.password}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">สิทธิ์การใช้งาน:</h4>
                  <ul className="space-y-1">
                    {account.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className={`w-2 h-2 rounded-full ${
                          account.type === 'admin' ? 'bg-red-400' : 'bg-blue-400'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(`Email: ${account.email}\nPassword: ${account.password}`);
                      }}
                    >
                      Copy Credentials
                    </Button>
                    <Button
                      size="sm"
                      className={`flex-1 ${
                        account.type === 'admin'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      onClick={() => {
                        window.open('/login', '_blank');
                      }}
                    >
                      Test Login
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-yellow-800 mb-2">หมายเหตุสำหรับการทดสอบ</h3>
              <p className="text-sm text-yellow-700">
                • บัญชีเหล่านี้เป็นข้อมูล Mock สำหรับการทดสอบเท่านั้น<br/>
                • คุณต้องสร้างบัญชีจริงผ่านหน้า Register ก่อนถึงจะสามารถ Login ได้<br/>
                • Admin จะมีสิทธิ์เต็มในการจัดการระบบ ส่วน User จะมีสิทธิ์จำกัด<br/>
                • ข้อมูลจะถูกเก็บในฐานข้อมูล Supabase
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MockAccountSetup;