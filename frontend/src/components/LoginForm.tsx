
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
