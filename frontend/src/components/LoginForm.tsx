
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Shield, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const form = useForm<LoginFormData>();

  // Demo accounts for testing
  const demoAccounts = [
    {
      type: 'admin',
      email: 'admin@birdie.com',
      password: 'admin123',
      name: 'ผู้ดูแลระบบ',
      description: 'สามารถจัดการอีเวนต์และดูข้อมูลทั้งหมด'
    },
    {
      type: 'user',
      email: 'user@birdie.com',
      password: 'user123',
      name: 'ผู้ใช้ทั่วไป',
      description: 'สามารถลงทะเบียนเข้าร่วมอีเวนต์'
    }
  ];

  const fillMockData = (account: typeof demoAccounts[0]) => {
    form.setValue('email', account.email);
    form.setValue('password', account.password);
    toast({
      title: "ข้อมูลถูกใส่แล้ว",
      description: `กรอกข้อมูล ${account.name} เรียบร้อยแล้ว`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "คัดลอกแล้ว",
      description: "คัดลอกข้อมูลไปยังคลิปบอร์ดแล้ว",
    });
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    console.log('Login attempt:', data.email);
    
    const { error } = await login(data.email, data.password);
    
    if (error) {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับเข้าสู่ระบบจัดการแบดมินตัน",
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold text-gray-900">
            เข้าสู่ระบบ
          </CardTitle>
          <p className="text-gray-600">เข้าสู่ระบบเพื่อจองคอร์ทแบดมินตัน</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Mock Account Cards */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-700 mb-3">บัญชีสำหรับทดสอบ</h3>
            </div>
            
            <div className="grid gap-3">
              {demoAccounts.map((account, index) => (
                <Card key={index} className="border-2 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => fillMockData(account)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          account.type === 'admin' 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {account.type === 'admin' ? 
                            <Shield className="w-4 h-4" /> : 
                            <User className="w-4 h-4" />
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{account.name}</h4>
                            <Badge variant={account.type === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                              {account.type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{account.description}</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Email:</span>
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{account.email}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(account.email);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Password:</span>
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{account.password}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(account.password);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-xs text-blue-600 font-medium">คลิกเพื่อใส่ข้อมูลอัตโนมัติ</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">หรือเข้าสู่ระบบด้วยข้อมูลของคุณ</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'กรุณากรอกอีเมล',
                  pattern: {
                    value: /^\S+@\S+$/,
                    message: 'รูปแบบอีเมลไม่ถูกต้อง'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">อีเมล</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: 'กรุณากรอกรหัสผ่าน',
                  minLength: {
                    value: 6,
                    message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">รหัสผ่าน</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-12 text-base pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          </Form>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              ยังไม่มีบัญชี?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                สมัครสมาชิก
              </Link>
            </p>
            <Link 
              to="/" 
              className="inline-block text-sm text-gray-600 hover:text-gray-500 py-2 px-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
