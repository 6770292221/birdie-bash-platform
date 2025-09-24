// API utility functions for gateway integration (axios version)

import axios, { AxiosError, AxiosInstance } from "axios";

// Vite only exposes variables prefixed with VITE_
const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string) || "http://localhost:3000";

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
  phoneNumber: string;
  skill: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  phoneNumber?: string;
  skillLevel?: "P" | "S" | "BG" | "N";
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
  private http: AxiosInstance;

  constructor(baseURL: string = GATEWAY_URL) {
    this.baseURL = baseURL;
    // Load token from localStorage if available
    this.token = localStorage.getItem("authToken");
    this.http = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    // Attach token automatically
    this.http.interceptors.request.use((config) => {
      if (this.token) {
        config.headers = config.headers || {};
        (config.headers as any)["Authorization"] = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("authToken", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("authToken");
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; data?: any; params?: any; headers?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const res = await this.http.request({
        url: endpoint,
        method: (options.method || "GET") as any,
        data: options.data,
        params: options.params,
        headers: options.headers,
      });

      const data = res.data;
      return {
        success: true,
        data: data?.data ?? data,
        message: data?.message,
      };
    } catch (err) {
      const axErr = err as AxiosError<any>;
      const statusText = axErr.response?.status
        ? `HTTP ${axErr.response.status}`
        : "Network error";
      const message = (axErr.response?.data as any)?.message || axErr.message || statusText;
      return { success: false, error: message };
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      data: credentials,
    });
  }

  async register(
    userData: RegisterRequest
  ): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      data: userData,
    });
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request("/api/auth/logout", { method: "POST" });

    if (response.success) {
      this.clearToken();
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>("/api/auth/me");
  }

  async refreshToken(): Promise<
    ApiResponse<{ token: string; expiresIn: string }>
  > {
    return this.request("/api/auth/refresh", { method: "POST" });
  }

  // Event endpoints
  async getEvents(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/events`, {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
      },
    });
  }

  async getEvent(eventId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`);
  }

  async createEvent(eventData: any): Promise<ApiResponse<any>> {
    return this.request("/api/events", { method: "POST", data: eventData });
  }

  async updateEvent(
    eventId: string,
    eventData: any
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`, { method: "PUT", data: eventData });
  }

  async deleteEvent(eventId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`, { method: "DELETE" });
  }

  // Registration endpoints
  async registerForEvent(
    eventId: string,
    registrationData: any
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/register`, {
      method: "POST",
      data: registrationData,
    });
  }

  async cancelEventRegistration(
    eventId: string,
    registrationId: string
  ): Promise<ApiResponse<any>> {
    return this.request(
      `/api/registration/events/${eventId}/registrations/${registrationId}/cancel`,
      { method: "PUT" }
    );
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
    "Invalid credentials": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "User already exists": "มีผู้ใช้งานนี้ในระบบแล้ว",
    "User not found": "ไม่พบผู้ใช้งาน",
    "Invalid token": "โทเคนไม่ถูกต้อง",
    "Token expired": "โทเคนหมดอายุ",
    "Network error": "ข้อผิดพลาดเครือข่าย",
  };

  return errorMap[error] || error || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
};
