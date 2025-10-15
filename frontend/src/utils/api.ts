// API utility functions for gateway integration (axios version)

import axios, { AxiosError, AxiosInstance, AxiosRequestHeaders } from "axios";

// Vite only exposes variables prefixed with VITE_
const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string) || "http://localhost:3000";

export interface ApiResponse<T = unknown> {
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

// Registration types
export interface GuestRegisterRequest {
  name: string;
  phoneNumber: string;
  startTime?: string;
  endTime?: string;
}

export interface MemberRegisterRequest {
  startTime?: string;
  endTime?: string;
}

export interface PlayerItem {
  playerId: string;
  userId?: string | null;
  name: string;
  email?: string;
  phoneNumber?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  userType?: "member" | "guest";
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
        if (!config.headers) {
          config.headers = {} as AxiosRequestHeaders;
        }
        (config.headers as AxiosRequestHeaders)["Authorization"] = `Bearer ${this.token}`;
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
    options: { method?: string; data?: unknown; params?: Record<string, unknown>; headers?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const res = await this.http.request({
        url: endpoint,
        method: options.method || "GET",
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
      const axErr = err as AxiosError<{ message?: string; details?: unknown }>;
      const statusText = axErr.response?.status
        ? `HTTP ${axErr.response.status}`
        : "Network error";

      const responseData = axErr.response?.data;
      let errorMessage = responseData?.message || axErr.message || statusText;

      // Only use details if there's no message
      if (!responseData?.message && responseData?.details) {
        if (typeof responseData.details === 'string') {
          errorMessage = responseData.details;
        } else if (typeof responseData.details === 'object') {
          // Extract specific error messages from details object
          const detailValues = Object.values(responseData.details);
          if (detailValues.length > 0) {
            // Find the first string value in details
            const firstDetailMessage = detailValues.find(v => typeof v === 'string');
            if (firstDetailMessage) {
              errorMessage = firstDetailMessage;
            } else {
              // If details contain nested objects, try to extract meaningful messages
              const nestedMessages = detailValues
                .filter(v => typeof v === 'object' && v !== null)
                .map(obj => {
                  const objValues = Object.values(obj as Record<string, unknown>);
                  return objValues.find(val => typeof val === 'string');
                })
                .filter(Boolean);

              if (nestedMessages.length > 0) {
                errorMessage = nestedMessages[0] as string;
              }
            }
          }
        }
      }

      return { success: false, error: errorMessage };
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
    try {
      const res = await this.http.get("/api/auth/verify");
      return {
        success: true,
        data: res.data?.user,
        message: res.data?.message,
      };
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string; details?: unknown }>;
      const message = (axErr.response?.data as { message?: string })?.message || axErr.message || "Network error";
      return { success: false, error: message };
    }
  }

  async refreshToken(): Promise<
    ApiResponse<{ token: string; expiresIn: string }>
  > {
    return this.request("/api/auth/refresh", { method: "POST" });
  }

  // Auth user profile by ID (protected)
  async getAuthUser(userId: string): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/api/auth/user/${userId}`);
  }

  // Event endpoints
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    date?: string;
    eventName?: string;
  }): Promise<ApiResponse<{ events: unknown[] }>> {
    return this.request(`/api/events`, {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        date: params?.date,
        eventName: params?.eventName,
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
    return this.request(`/api/events/${eventId}`, { method: "PATCH", data: eventData });
  }

  async deleteEvent(eventId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/events/${eventId}`, { method: "DELETE" });
  }

  // Registration endpoints
  async addGuest(
    eventId: string,
    guest: GuestRegisterRequest
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/guests`, {
      method: "POST",
      data: guest,
    });
  }

  async registerMember(
    eventId: string,
    data: MemberRegisterRequest
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/members`, {
      method: "POST",
      data,
    });
  }

  async getPlayers(
    eventId: string,
    params?: { limit?: number; offset?: number; status?: string }
  ): Promise<ApiResponse<{ players: PlayerItem[] }>> {
    return this.request(`/api/registration/events/${eventId}/players`, {
      params,
    });
  }

  async getUserRegistrations(
    params?: { includeCanceled?: boolean }
  ): Promise<ApiResponse<{ registrations: PlayerItem[] }>> {
    const query: Record<string, any> = {};
    if (typeof params?.includeCanceled === 'boolean') {
      query.includeCanceled = params.includeCanceled;
    }
    return this.request(`/api/registration/users/registrations`, {
      params: Object.keys(query).length ? query : undefined,
    });
  }

  async cancelPlayer(eventId: string, playerId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/registration/events/${eventId}/players/${playerId}/cancel`, {
      method: "POST",
    });
  }

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

    // Settlement endpoints
  async issueSettlement(eventId: string, data: {
    currency?: string;
    shuttlecockCount?: number;
    absentPlayerIds?: string[];
  }): Promise<ApiResponse<unknown>> {
    return this.request(`/api/settlements/issue`, {
      method: "POST",
      data: {
        event_id: eventId,
        currency: data.currency || 'THB',
        shuttlecockCount: data.shuttlecockCount || 0,
        absentPlayerIds: data.absentPlayerIds || []
      }
    });
  }

  async calculateSettlement(eventId: string): Promise<ApiResponse<unknown>> {
    return this.request(`/api/settlements/calculate`, {
      method: "POST",
      data: {
        event_id: eventId
      }
    });
  }

  // Settlement detail endpoint (mocked for now)
  async getSettlements(eventId: string): Promise<ApiResponse<unknown>> {
    // Mock data for now - replace with real API call later
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock data - ใช้ player IDs จริงจากข้อมูล API ล่าสุด
        const mockPayments = [
          // Guest ไม่มีค่าปรับ (isPenalty: false)
          { playerId: "68d7b9e9744183cc4927b403", playerName: "mind_guest", amount: 250, status: "paid", paidAt: "2024-01-15T10:30:00Z", hasPenalty: false },
          // Guest มีค่าปรับ (isPenalty: true)
          { playerId: "68d7b9f2744183cc4927b40e", playerName: "mind_guest_2", amount: 300, status: "pending", paidAt: null, hasPenalty: true, penaltyAmount: 50 },
          // Member ยังไม่จ่าย ไม่มีค่าปรับ (isPenalty: false)
          { playerId: "68d7ba9f744183cc4927b41e", playerName: "mind2@gmail.com", amount: 250, status: "pending", paidAt: null, hasPenalty: false },
        ];
        resolve({
          success: true,
          data: {
            eventId,
            totalAmount: 1000,
            paidAmount: 500,
            pendingAmount: 500,
            payments: mockPayments
          }
        });
      }, 500); // Simulate network delay
    });
  }

  // Payments: fetch payments by event from real payment service
  async getEventPayments(eventId: string): Promise<ApiResponse<{ payments: { playerId: string; amount: number; status: 'PENDING' | 'COMPLETED' }[] }>> {
    // Call absolute URL to payment service (port 8080)
    return this.request<{ payments: { playerId: string; amount: number; status: 'PENDING' | 'COMPLETED' }[] }>(`http://localhost:8080/api/payments/event/${eventId}`);
  }

  // Payments: fetch payments by player (optionally filter by event)
  async getPlayerPayments(playerId: string, params?: { eventId?: string; status?: string }): Promise<ApiResponse<{ payments: Array<{ id: string; status: string; amount: number; currency: string; qrCodeUri?: string | null; eventId?: string; createdAt?: string; updatedAt?: string }> }>> {
    const query: Record<string, any> = {};
    if (params?.eventId) query.eventId = params.eventId;
    if (params?.status) query.status = params.status;
    return this.request(`/api/payments/player/${playerId}`, { params: Object.keys(query).length ? query : undefined });
  }

  // Mark player as paid endpoint (mocked for now)
  async markPlayerAsPaid(eventId: string, playerId: string): Promise<ApiResponse<unknown>> {
    // Mock response for now - replace with real API call later
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            playerId,
            status: "paid",
            paidAt: new Date().toISOString(),
            message: "Player marked as paid successfully"
          }
        });
      }, 300);
    });
  }

  // Venue endpoints
  async getVenues(params?: {
    name?: string;
    rating?: number;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<unknown>> {
    return this.request("/api/event/venues", { params });
  }

  async getVenue(venueId: string): Promise<ApiResponse<unknown>> {
    return this.request(`/api/event/venues/${venueId}`);
  }

  // Matching service integration
   private async matchingRequest<T>(
    endpoint: string,
    options: { method?: string; data?: any } = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: options.method || "GET",
      data: options.data,
    });
  }

  // Matching endpoints
  async seedMatching(eventId: string): Promise<ApiResponse<any>> {
    return this.matchingRequest("/api/matchings/seed", {
      method: "POST",
      data: { eventId }
    });
  }

  async advanceMatching(eventId: string, data?: {
    courtId?: string;
    at?: string;
  }): Promise<ApiResponse<any>> {
    return this.matchingRequest("/api/matchings/advance", {
      method: "POST",
      data: {
        eventId,
        ...data
      }
    });
  }

  async closeMatching(eventId: string): Promise<ApiResponse<any>> {
    return this.matchingRequest("/api/matchings/close", {
      method: "POST",
      data: { eventId }
    });
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