
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, handleApiError, User } from '../utils/api';

type SkillLevel = 'P' | 'S' | 'BG' | 'N';

interface UserProfile extends User {
  skillLevel?: SkillLevel;
}

interface AuthContextType {
  user: UserProfile | null;
  session: { user: UserProfile } | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string, phoneNumber?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<{ user: UserProfile } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setLoading(true);

    // Check if we have a token
    const token = localStorage.getItem('authToken');

    if (token) {
      try {
        // Try to get current user info with the token
        const response = await apiClient.getCurrentUser();

        if (response.success && response.data) {
          const userData = response.data as UserProfile;
          setUser(userData);
          setSession({ user: userData });
        } else {
          // Token is invalid, clear it
          apiClient.clearToken();
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        apiClient.clearToken();
        localStorage.removeItem('authToken');
      }
    }

    setLoading(false);
  };

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setLoading(true);

      const response = await apiClient.login({ email, password });

      if (response.success && response.data) {
        // Set token in API client
        apiClient.setToken(response.data.token);

        const userData = response.data.user as UserProfile;
        setUser(userData);
        setSession({ user: userData });

        return {};
      } else {
        return { error: handleApiError(response.error || 'Login failed') };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string
  ): Promise<{ error?: string }> => {
    try {
      setLoading(true);

      const response = await apiClient.register({
        email,
        password,
        name,
        phoneNumber
      });

      if (response.success && response.data) {
        // Auto login after successful registration
        apiClient.setToken(response.data.token);

        const userData = response.data.user as UserProfile;
        setUser(userData);
        setSession({ user: userData });

        return {};
      } else {
        return { error: handleApiError(response.error || 'Registration failed') };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint (optional - for server-side cleanup)
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setSession(null);
      apiClient.clearToken();
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      login, 
      register, 
      logout, 
      isAdmin, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
