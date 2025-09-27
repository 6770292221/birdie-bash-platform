
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
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const form = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', {
        message: t('validation.password_mismatch')
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
        title: "ลงทะเบียนไม่สำเร็จ",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "สามารถเข้าสู่ระบบได้ทันที",
      });
      navigate('/login');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-md border-0 shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600" />
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            {t('register.title')}
          </CardTitle>
          <p className="text-gray-700 text-base">{t('register.subtitle')}</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: t('validation.required_name'),
                  minLength: {
                    value: 2,
                    message: t('validation.min_name')
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('name_placeholder')}
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
                  required: t('validation.required_skill')
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.skill_level')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('skill_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BG">{t('skill.beginner_0')}</SelectItem>
                        <SelectItem value="BG">{t('skill.beginner_1')}</SelectItem>
                        <SelectItem value="S">{t('skill.s_minus')}</SelectItem>
                        <SelectItem value="S">{t('skill.s')}</SelectItem>
                        <SelectItem value="N">{t('skill.n')}</SelectItem>
                        <SelectItem value="P">{t('skill.p_minus')}</SelectItem>
                        <SelectItem value="P">{t('skill.p')}</SelectItem>
                        <SelectItem value="P">{t('skill.p_plus')}</SelectItem>
                        <SelectItem value="C">{t('skill.c')}</SelectItem>
                        <SelectItem value="B">{t('skill.b')}</SelectItem>
                        <SelectItem value="A">{t('skill.a')}</SelectItem>
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
                  required: t('validation.required_email'),
                  pattern: {
                    value: /^\S+@\S+$/,
                    message: t('validation.invalid_email')
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('login.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('email_placeholder')}
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
                  required: t('validation.required_phone'),
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: t('validation.invalid_phone')
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.phone')}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder={t('phone_placeholder')}
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
                  required: t('validation.required_password'),
                  minLength: {
                    value: 6,
                    message: t('validation.min_password')
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('login.password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('password_placeholder')}
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
                  required: t('validation.required_confirm_password')
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.confirm_password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('password_placeholder')}
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
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('register.registering')}
                  </>
                ) : (
                  t('register.title')
                )}
              </Button>

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-700">
                  {t('register.have_account')}{' '}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">
                    {t('register.login_link')}
                  </Link>
                </p>
                <Link
                  to="/"
                  className="inline-block text-sm text-gray-600 hover:text-gray-800 py-2 px-6 rounded-xl bg-gray-100/60 hover:bg-gray-200/70 border border-gray-200/50 transition-all duration-200 font-medium"
                >
                  {t('nav.back_home')}
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
