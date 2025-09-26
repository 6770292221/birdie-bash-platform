
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
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const form = useForm<LoginFormData>();


  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    console.log('Login attempt:', data.email);
    
    const { error } = await login(data.email, data.password);
    
    if (error) {
      toast({
        title: t('login.failed'),
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('login.success'),
        description: t('login.success_desc'),
      });
      navigate('/');
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
        <CardHeader className="text-center space-y-4 pb-6">
          <CardTitle className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            {t('login.title')}
          </CardTitle>
          <p className="text-gray-700 text-base">{t('login.subtitle')}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormLabel className="text-base">{t('login.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('email_placeholder')}
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
                  required: t('validation.required_password'),
                  minLength: {
                    value: 6,
                    message: t('validation.min_password')
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('login.password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('password_placeholder')}
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
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('login.logging_in')}
                  </>
                ) : (
                  t('login.title')
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-700">
              {t('login.no_account')}{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">
                {t('login.register_link')}
              </Link>
            </p>
            <Link
              to="/"
              className="inline-block text-sm text-gray-600 hover:text-gray-800 py-2 px-6 rounded-xl bg-gray-100/60 hover:bg-gray-200/70 border border-gray-200/50 transition-all duration-200 font-medium"
            >
              {t('nav.back_home')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
