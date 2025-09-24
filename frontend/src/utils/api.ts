// API utility functions for gateway integration

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  phoneNumber?: string;
  skillLevel?: 'P' | 'S' | 'BG' | 'N';
  profilePicture?: string;
  joinedDate?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = GATEWAY_URL) {
    this.baseURL = baseURL;
    // Load token from localStorage if available
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/api/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.clearToken();
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/auth/me');
  }

  async refreshToken(): Promise<ApiResponse<{ token: string; expiresIn: string }>> {
    return this.request('/api/auth/refresh', {
      method: 'POST',
    });
  }

  // Event endpoints
  async getEvents(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `/api/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getEvent(eventId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`);
  }

  async createEvent(eventData: any): Promise<ApiResponse<any>> {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(eventId: string, eventData: any): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(eventId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Registration endpoints
  async registerForEvent(eventId: string, registrationData: any): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
  }

  async cancelEventRegistration(eventId: string, registrationId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/registrations/${registrationId}/cancel`, {
      method: 'PUT',
    });
  }

  async getEventRegistrations(eventId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/registrations`);
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Utility function to handle API errors
export const handleApiError = (error: string): string => {
  // Map common error messages to Thai
  const errorMap: Record<string, string> = {
    'Invalid credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'User already exists': 'มีผู้ใช้งานนี้ในระบบแล้ว',
    'User not found': 'ไม่พบผู้ใช้งาน',
    'Invalid token': 'โทเคนไม่ถูกต้อง',
    'Token expired': 'โทเคนหมดอายุ',
    'Network error': 'ข้อผิดพลาดเครือข่าย',
  };

  return errorMap[error] || error || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
};