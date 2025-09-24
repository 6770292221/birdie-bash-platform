
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  skill: string;
}

const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const form = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', {
        message: 'รหัสผ่านไม่ตรงกัน'
      });
      return;
    }
    
    setIsLoading(true);
    console.log('Register attempt:', data.email);
    // Sanitize phone to be digits-only and max length 10
    const sanitizedPhone = (data.phoneNumber || '').replace(/\D/g, '').slice(0, 10);
    
    const { error } = await register(
      data.email,
      data.password,
      data.name,
      sanitizedPhone,
      data.skill
    );
    
    if (error) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "สมัครสมาชิกสำเร็จ",
        description: "สามารถเข้าสู่ระบบได้ทันที",
      });
      navigate('/login');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            สมัครสมาชิก
          </CardTitle>
          <p className="text-gray-600">สร้างบัญชีใหม่เพื่อจองคอร์ทแบดมินตัน</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: 'กรุณากรอกชื่อ',
                  minLength: {
                    value: 2,
                    message: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ชื่อของคุณ"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skill"
                rules={{
                  required: 'กรุณาเลือกระดับความเชี่ยวชาญ'
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ระดับความเชี่ยวชาญ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกระดับความเชี่ยวชาญ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BG">0 - มือเปาะแปะ (BG - Beginner)</SelectItem>
                        <SelectItem value="BG">1 - มือหน้าบ้าน (BG - Beginner)</SelectItem>
                        <SelectItem value="S">2 - มือ S- (เริ่มเข้าฟอร์มมาตรฐาน)</SelectItem>
                        <SelectItem value="S">3 - มือ S (ฟอร์มมาตรฐาน)</SelectItem>
                        <SelectItem value="N">4 - มือ N (ฟอร์มเท่นื่อขึ้น)</SelectItem>
                        <SelectItem value="P">5 - มือ P- (ฟอร์มใกล้เคียงโค้ชทั่วไป)</SelectItem>
                        <SelectItem value="P">6 - มือ P (ฟอร์มโค้ชทั่วไป)</SelectItem>
                        <SelectItem value="P">7 - มือ P+ (ฟอร์มนักกีฬาอภิวัฒน์/จังหวัด)</SelectItem>
                        <SelectItem value="C">8 - มือ C (ฟอร์มนักกีฬาเขต/เยาวชนทีมชาติ)</SelectItem>
                        <SelectItem value="B">9 - มือ B (ฟอร์มนักกีฬาทีมชาติระดับประเทศ)</SelectItem>
                        <SelectItem value="A">10 - มือ A (ฟอร์มนักกีฬาทีมชาติระดับนานาชาติ)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                rules={{
                  required: 'กรุณากรอกหมายเลขโทรศัพท์',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หมายเลขโทรศัพท์</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="0812345678"
                        maxLength={10}
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                          field.onChange(digitsOnly);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ') e.preventDefault();
                        }}
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
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{
                  required: 'กรุณายืนยันรหัสผ่าน'
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ยืนยันรหัสผ่าน</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
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
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  มีบัญชีอยู่แล้ว?{' '}
                  <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                    เข้าสู่ระบบ
                  </Link>
                </p>
                <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
                  กลับหน้าหลัก
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;
