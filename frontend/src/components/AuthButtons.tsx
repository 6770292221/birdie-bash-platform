
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

const AuthButtons = () => {
  return (
    <div className="flex gap-2">
      <Link to="/login">
        <Button variant="outline" size="sm">
          <LogIn className="h-4 w-4 mr-2" />
          เข้าสู่ระบบ
        </Button>
      </Link>
      <Link to="/register">
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          สมัครสมาชิก
        </Button>
      </Link>
    </div>
  );
};

export default AuthButtons;
